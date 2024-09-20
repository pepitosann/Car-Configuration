"use strict"

const sqlite = require("sqlite3");
const crypto = require("crypto");

const dbAllAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

const dbRunAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, err => {
    if (err) reject(err);
    else resolve();
  });
});

const dbGetAsync = (db, sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

/**
 * Interface to the sqlite database for the application
 *
 * @param dbname name of the sqlite3 database file to open
 */
function Database(dbname) {
  this.db = new sqlite.Database(dbname, err => {
    if (err) throw err;
  });

  /**
  * Retrieve the list of all models from the db
  *
  * @returns a Promise that resolves to the list of model objects as: {id, name, power, price, maxNumber}
  */
  this.getModels = async () => {
    const models = (await dbAllAsync(this.db, "select id, name, power, price, max_number as maxNumber FROM models"))
    return models;
  };

  /**
   * Retrieve the list of all accessories from the db
   *
   * @returns a Promise that resolves to the list of model objects as: {id, name, description, price, availability, mandatory}
   */
  this.getAccessories = async () => {
    const accessories = (await dbAllAsync(this.db, "select id, name, description, price, availability, mandatory FROM accessories"))
      .map(c => ({ ...c, incompat: [] })); // Add incompat list 
    const incompats = await dbAllAsync(this.db, "select * from incompats");

    for (const { accessory, incompat } of incompats) {
      // Append incompatibility to the correct accessory
      const main = accessories.find(c => c.id === accessory);
      if (!main) throw "DB inconsistent";

      main.incompat.push(incompat);
    }

    return accessories;
  };

  /**
   * Retrieve the quantity of available accessories from the db
   *
   * @returns a Promise that resolves to the quantity of available accessories
   */
  this.getAvailableAccessories = async () => {

    const maximum = (await dbAllAsync(this.db, "select id, availability FROM accessories"))

    // Convert to a single object
    const res1 = {};
    for (const { id, availability } of maximum) {
      res1[id] = availability;
    }

    const selected = (await dbAllAsync(this.db, `select accessory_id, count(*) as numSelectedAccessories
                                                from selected_accessories
                                                group by accessory_id`))

    // Convert to a single object
    const res2 = {};
    for (const { accessory_id, numSelectedAccessories } of selected) {
      res2[accessory_id] = numSelectedAccessories;
    }

    // Calculate the difference and store it in an array called available
    const available = {};

    // Iterate over keys in res1 (assuming it has all keys needed)
    Object.keys(res1).forEach(id => {
      available[id] = res1[id] - (res2[id] || 0);
    });

    return available;
  };

  /**
   * Retrieve the list of accessories in the user's selected accessories
   * 
   * @param userId the numeric id of the user whose selected accessories list is to be returned
   * 
   * @returns a Promise that resolves to a list of accesory code strings
   */
  this.getSelectedAccessories = async userId => {
    const rows = await dbAllAsync(
      this.db,
      "select accessory_id from selected_accessories where user_id = ?",
      [userId]
    );
    const accesoryIds = rows.map(row => row.accessory_id);
    return accesoryIds;
  };

  /**
   * Retrieve the list of maximum number of accessories selectable for each model
   *
   * @returns a Promise that resolves to a list of the maximum number of accessories selectable for each model
   */
  this.getMaximum = async () => {
    return (await dbAllAsync(
      this.db,
      "select max_number from models"
    ))
  };


  /**
   * Retrieve the number of selected accessories by a user
   * 
   * @param userId the numeric id of the user whose selected accessories number is to be returned
   * 
   * @returns a Promise that resolves to the number of selected accessories
   */
  this.getAvailableAccessoriesPerModel = async userId => {
    return (await dbAllAsync(
      this.db,
      "select count(*) from selected_accessories where user_id = ?",
      [userId]
    ))
  };

  /**
   * Retrieve the list of model and accessories in the user's car configuration
   * 
   * @param userId the numeric id of the user whose car configuration is to be returned
   * 
   * @returns a Promise that resolves to a list of model and accessories
   */
  this.getCarConfiguration = async userId => {
    let model = [];
    model = await dbAllAsync(
      this.db,
      "SELECT model_id, models.name AS modelName FROM car_configurations JOIN models ON car_configurations.model_id = models.id WHERE car_configurations.user_id = ?",
      [userId]
    );
    let accessories = [];
    accessories = await dbAllAsync(
      this.db,
      "SELECT accessory_id, accessories.name AS accessory_name FROM selected_accessories JOIN accessories ON selected_accessories.accessory_id = accessories.id WHERE selected_accessories.user_id = ?",
      [userId]
    );

    const carConfiguration = { model: model, accessories: accessories };
    return carConfiguration;
  };

  /**
   * Delete the specified user's car configuration
   * 
   * @param userId the id of the user whose car configuration is to be deleted
   * 
   * @returns a Promise that resolves to nothing when the car configuration has been deleted
   */
  this.deleteCarConfiguration = userId => Promise.all([
    dbRunAsync(
      this.db,
      "update users set owner = null where id = ?",
      [userId]
    ),
    dbRunAsync(
      this.db,
      "delete from car_configurations where user_id = ?",
      [userId]
    ),
    dbRunAsync(
      this.db,
      "delete from selected_accessories where user_id = ?",
      [userId]
    )
  ]);

  /**
   * Authenticate a user from their username and password
   * 
   * @param username username of the user to authenticate
   * @param password password of the user to authenticate
   * 
   * @returns a Promise that resolves to the user object {id, username, quality}
   */
  this.authUser = (username, password) => new Promise((resolve, reject) => {
    // Get the user with the given username
    dbGetAsync(
      this.db,
      "select * from users where username = ?",
      [username]
    )
      .then(user => {
        if (!user) resolve(false);

        // Verify the password
        crypto.scrypt(password, user.salt, 32, (err, hash) => {
          if (err) reject(err);

          if (crypto.timingSafeEqual(hash, Buffer.from(user.hash, "hex")))
            resolve({ id: user.id, username: user.username, owner: user.owner, quality: user.quality === null ? null : Boolean(user.quality) });
          else resolve(false);
        });
      })
      .catch(e => reject(e));
  });

  /**
   * Retrieve the user with the specified id
   * 
   * @param id the id of the user to retrieve
   * 
   * @returns a Promise that resolves to the user object {id, username, quality}
   */
  this.getUser = async id => {
    const user = await dbGetAsync(
      this.db,
      "select username, quality, owner from users where id = ?",
      [id]
    );

    return { ...user, id, quality: user.quality === null ? null : Boolean(user.quality) };
  };

  /**
  * Create a new car configuration for the specified user.
  * 
  * @param cc list of model and accessories id strings that make up the car configuration
  * @param userId id of the user
  * 
  * @returns a Promise that resolves to nothing on success
  */
  this.createCarConfiguration = (cc, userId) => {
    //Set owner param for the user
    const p0 = dbRunAsync(this.db, "update users set owner = ? where id = ?", [1, userId]);

    let p1;
    let p2;

    if (cc.model.length > 0) {
      const sql = "insert into car_configurations (user_id, model_id) values " + cc.model
        .map((c, i, a) => "(?, ?)" + (i < a.length - 1 ? "," : ""))
        .join('');
      const values = cc.model.flatMap(c => [userId, c.model_id]);
      p1 = dbRunAsync(this.db, sql, values);
    } else
      p1 = Promise.resolve();

    if (cc.accessories.length > 0) {
      const sql = "insert into selected_accessories (user_id, accessory_id) values " + cc.accessories
        .map((c, i, a) => "(?, ?)" + (i < a.length - 1 ? "," : ""))
        .join('');
      const values = cc.accessories.flatMap(c => [userId, c.accessory_id]);
      p2 = dbRunAsync(this.db, sql, values);
    } else
      p2 = Promise.resolve();

    return Promise.all([p0, p1, p2]);
  };

  /**
   * Edit the current car configuration for the specified user by adding and removing the given accessories
   * 
   * @param add list of accessories to be added to the car configuration
   * @param rem list of accessories to be removed from the car configuration
   * @param userId id of the user
   */
  this.editCarConfiguration = (add, rem, userId) => {
    // Add
    let pAdd;

    if (add.length > 0) {
      const sql = "insert into selected_accessories (user_id, accessory_id) values " + add
        .map((c, i) => "(?, ?)").join(", ");
      const values = add.flatMap(c => [userId, c.accessory_id]);

      pAdd = dbRunAsync(this.db, sql, values);
    } else
      pAdd = Promise.resolve();

    // Remove
    const pRem = rem.map(c => dbRunAsync(this.db, "delete from selected_accessories where user_id = ? and accessory_id = ?", [userId, c.accessory_id]));

    return Promise.all([pAdd, pRem].flat());
  };


  /**
   * Check the validity of the provided car configuration for the given user
   * 
   * @param cc list of model and acecssories id strings that make up the car configuration
   * @param userId id of the user
   * 
   * @returns a list of error strings. When empty, the car configuration is considered valid
   */
  this.checkCarConfiguration = async (cc, userId) => {
    // The user has been authenticated, so it's safe to assume it exists

    // To check every constraint, we need the list of all accessories with the respective number of users (in order to check the availability).
    // Also, let's get the current selected accessories for the user to compare
    let [c, n, curSA] = await Promise.all([
      this.getAccessories(),
      this.getAvailableAccessories(),
      this.getSelectedAccessories(userId)
    ]);

    // To check every constraint, we need the list of all models with the respective maximum  number of accessories.
    // Also, let's get the current selected accessories for the user's model to compare
    let [c2, n2, curSAPM] = await Promise.all([
      this.getModels(),
      this.getMaximum(),
      this.getAvailableAccessoriesPerModel(userId)
    ]);

    const accessories = c.reduce((acc, { id, ...accessory }) => {
      acc[id] = { ...accessory, availability: n[id] || 0 };
      return acc;
    }, {});

    const models = c2.reduce((acc, { id, ...model }) => {
      acc[id] = { ...model, max_number: n2[id] };
      return acc;
    }, {});

    const errors = [];

    // Perform actual checks for accessories
    for (const { accessory_id } of cc.accessories) {
      const accessory = accessories[accessory_id];

      if (!accessory) {
        errors.push(`Accessory "${accessory_id}" does not exist`);
        continue;
      }

      // Accessory availability
      if (accessory.availability === 0 && !curSA.includes(accessory_id)) {
        errors.push(`Accessory "${accessory_id}" has reached the maximum number of usage`);
      }

      // Mandatory
      if (accessory.mandatory && !cc.accessories.some(c => c.accessory_id === accessory.mandatory)) {
        errors.push(`Accessory "${accessory_id}"'s mandatory constraint is not respected`);
      }

      // Incompatibility
      for (const i of accessory.incompat) {
        if (cc.accessories.some(c => c.accessory_id === i)) {
          errors.push(`Accessory "${accessory_id}" is incompatible with "${i}"`);
        }
      }
    }

    // Perform actual checks for models
    for (const { model_id } of cc.model) {
      const model = models[model_id];

      // Does the model exist?
      if (!model) {
        errors.push(`Model "${model_id}" does not exist`);
        continue;
      }

      // Accessory availabily per model
      if (model.max_number < curSAPM.length) {
        errors.push(`Model "${model_id}" has reached the maximum number of selected accessories`);
      }
    }

    return errors;
  };
}

const connect = () => {
  console.log("Connecting to the database...");
};

module.exports = Database;