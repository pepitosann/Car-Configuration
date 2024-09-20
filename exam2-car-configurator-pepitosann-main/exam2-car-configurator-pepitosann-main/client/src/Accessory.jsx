/**
 * The Accessory type, used throughout the app.
 * This is a constructor function.
 *
 * @param id the accessory ID, a unique integer.
 * @param name the accessory name.
 * @param description a description of the accessory.
 * @param price the price of the accessory.
 * @param availability the availability count of the accessory.
 * @param mandatory optional string of the accessory id that's mandatory for this one.
 * @param incompat optional string of the accessory id that's incompatible for this one.
 */
function Accessory(id, name, description, price, availability, mandatory = null, incompat = []) {
  this.id = id;
  this.name = name;
  this.description = description;
  this.price = price;
  this.availability = availability;
  this.mandatory = mandatory;
  this.incompat = incompat;
}

export { Accessory };