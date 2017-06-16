import { jsonEval, stringify } from "../../../utils/json";

/**
 * Wraps a DOM Storage object and:
 * - automatically encode objects as JSON strings before storing them to allow us to store arbitrary types.
 * - prefixes names with "firebase:" to avoid collisions with app data.
 *
 * We automatically (see storage.js) create two such wrappers, one for sessionStorage,
 * and one for localStorage.
 *
 * @param {Storage} domStorage The underlying storage object (e.g. localStorage or sessionStorage)
 * @constructor
 */
export class DOMStorageWrapper {
  prefix_;
  domStorage_;

  constructor(domStorage) {
    this.domStorage_ = domStorage;

    // Use a prefix to avoid collisions with other stuff saved by the app.
    this.prefix_ = 'firebase:';
  };
  
  /**
   * @param {string} key The key to save the value under
   * @param {?Object} value The value being stored, or null to remove the key.
   */
  set(key, value) {
    if (value == null) {
      this.domStorage_.removeItem(this.prefixedName_(key));
    } else {
      this.domStorage_.setItem(this.prefixedName_(key), stringify(value));
    }
  };

  /**
   * @param {string} key
   * @return {*} The value that was stored under this key, or null
   */
  get(key) {
    var storedVal = this.domStorage_.getItem(this.prefixedName_(key));
    if (storedVal == null) {
      return null;
    } else {
      return jsonEval(storedVal);
    }
  };

  /**
   * @param {string} key
   */
  remove(key) {
    this.domStorage_.removeItem(this.prefixedName_(key));
  };

  isInMemoryStorage;

  /**
   * @param {string} name
   * @return {string}
   */
  prefixedName_(name) {
    return this.prefix_ + name;
  };

  toString() {
    return this.domStorage_.toString();
  };
}
