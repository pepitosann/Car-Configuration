/**
 * The Model type, used throughout the app.
 * This is a constructor function.
 *
 * @param id the model ID, a unique integer.
 * @param name the model name.
 * @param power the power of the model, restricted to certain values.
 * @param price the price of the model.
 * @param maxNumber the maximum number of accessories per model.
 */
function Model(id, name, power, price, maxNumber) {
    this.id = id;
    this.name = name;
    this.power = power;
    this.price = price;
    this.maxNumber = maxNumber;
  }
  
  export { Model };