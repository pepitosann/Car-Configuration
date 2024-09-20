"use strict"

const Database = require("./database");
const express = require("express");
const cors = require("cors");
const { body, validationResult } = require("express-validator");
const { initAuthentication, isLoggedIn } = require("./auth");
const passport = require("passport");

const jsonwebtoken = require('jsonwebtoken');
const jwtSecret = '47e5edcecab2e23c8545f66fca6f3aec8796aee5d830567cc362bb7fb31adafc';
const expireTime = 60; //seconds

const PORT = 3001;
const app = new express();
const db = new Database("car_config.db");

app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

initAuthentication(app, db);

/**
 * Get all the models
 *
 * This is an open endpoint: non authenticated users can still access this
 */
app.get("/api/models", async (req, res) => {
  try {
    const models = await db.getModels();
    res.json(models);
  } catch {
    res.status(500).json({ errors: ["Database error"] });
  }
});


/**
 * Get all the accessories
 * or
 * Get the number of available accessories for each accessory.
 *
 * This is an open endpoint: non authenticated users can still access this
 */
app.get("/api/accessories", async (req, res) => {
  try {
    const filter = req.query && req.query.filter;
    if (filter === 'available') {
      const available = await db.getAvailableAccessories();
      res.json(available);
    } else {
      const accessories = await db.getAccessories();
      res.json(accessories);
    }
  } catch {
    res.status(500).json({ errors: ["Database error"] });
  }
});

/**
 * Delete the current car configuration for the currently logged in user
 */
app.delete("/api/car-configuration", isLoggedIn, async (req, res) => {
  try {
    await db.deleteCarConfiguration(req.user.id);
    res.end();
  } catch {
    res.status(500).json({ errors: ["Database error"] });
  }
});

/**
 * Create a new car configuration for the currently logged in user
 */
app.post(
  "/api/car-configuration",
  isLoggedIn,
  body("cc", "No car configuration specified").isObject(),
  body("cc.model", "No car configuration model specified").isArray().isLength({min: 1}),
  body("cc.accessories", "No car configuration accessories specified").isArray(),
  body("cc.model.*", "Invalid format for model").isObject(),
  body("cc.accessories.*", "Invalid format for accessories").isObject(),
  async (req, res) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({ errors: errList });
    }

    // Check if there was already a car configuration
    if (req.user.owner !== null && req.user.owner !== undefined) {
      return res.status(422).json({ errors: ["Car Configuration already present"] });
    }

    try {
      const checkErrors = await db.checkCarConfiguration(req.body.cc, req.user.id);

      if (checkErrors.length > 0) {
        res.status(422).json({ errors: checkErrors });
      } else {
        // Perform the actual insertions
        await db.createCarConfiguration(req.body.cc, req.user.id);
        res.end();
      }
    } catch {
      return res.status(500).json({ errors: ["Database error"] });
    }
  });

/**
 * Edit the existing car configuration for the currently logged in user
 */
app.post(
  "/api/car-configuration-modifications",
  isLoggedIn,
  body("add", "add must be a list of accessories").isArray(),
  body("rem", "rem must be a list of accessories").isArray(),
  async (req, res) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({ errors: errList });
    }

    // Check if there was already a car configuration
    if (req.user.owner === null && req.user.owner === undefined) {
      return res.status(422).json({ errors: ["User doesn't currently have a car configuration"] });
    }

    // Build the resulting car configuration and validate it
    try {
      let cc = await db.getCarConfiguration(req.user.id);

      for (const c of req.body.add) {
        cc.accessories.push(c);
      }
      cc.accessories = cc.accessories.filter(c => !req.body.rem.some(remAcc => remAcc.accessory_id === c.accessory_id));

      // Validate the resulting study plan
      const checkErrors = await db.checkCarConfiguration(cc, req.user.id);

      if (checkErrors.length > 0) {
        res.status(422).json({ errors: checkErrors });
      } else {
        // Actually update the car configuration
        await db.editCarConfiguration(req.body.add, req.body.rem, req.user.id);
        res.end();
      }
    } catch {
      res.status(500).json({ errors: ["Database error"] });
    }
  });


/**
 * Authenticate and login
 */
app.post(
  "/api/session",
  body("username", "username is not a valid username").isString().notEmpty(),
  body("password", "password must be a non-empty string").isString().notEmpty(),
  (req, res, next) => {
    // Check if validation is ok
    const err = validationResult(req);
    const errList = [];
    if (!err.isEmpty()) {
      errList.push(...err.errors.map(e => e.msg));
      return res.status(400).json({ errors: errList });
    }

    // Perform the actual authentication
    passport.authenticate("local", (err, user) => {
      if (err) {
        res.status(err.status).json({ errors: [err.msg] });
      } else {
        req.login(user, err => {
          if (err) return next(err);
          else {
            // Get the car configuration for this user
            if (user.owner !== null) {
              db.getCarConfiguration(user.id)
                .then(cc => res.json({ username: user.username, owner: user.owner, quality: user.quality, cc }))
                .catch(() => {
                  res.status(500).json({ errors: ["Database error"] });
                });
            } else {
              res.json({ username: user.username, owner: user.owner, quality: user.quality });
            }
          }
        });
      }
    })(req, res, next);
  }
);

/**
 * Logout
 */
app.delete("/api/session", isLoggedIn, (req, res) => {
  req.logout(() => res.end());
});

/**
 * Check if the user is logged in and return their info
 */
app.get("/api/session/current", isLoggedIn, async (req, res) => {
  let cc = { model: undefined, accessories: undefined };
  let err = false;

  if (req.user.owner !== null) {
    await (db.getCarConfiguration(req.user.id)
      .then(cc2 => cc = cc2)
      .catch(() => {
        res.status(500).json({ errors: ["Database error"] });
        err = true;
      }));
  }

  if (!err) res.json({ username: req.user.username, quality: req.user.quality, owner: req.user.owner, cc });
});

/**
 * Get token
 */
app.get('/api/auth-token', isLoggedIn, (req, res) => {
  const quality = req.user.quality;

  const payloadToSign = { quality: quality, userId: req.user.id };
  const jwtToken = jsonwebtoken.sign(payloadToSign, jwtSecret, { expiresIn: expireTime });

  res.json({ token: jwtToken });
});


app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}/`));