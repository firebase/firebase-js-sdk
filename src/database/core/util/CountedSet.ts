import { isEmpty, getCount, forEach, contains } from "../../../utils/obj";

/**
 * Implements a set with a count of elements.
 *
 */
export class CountedSet {
  set: object;
  
  /**
   * @template K, V
   */
  constructor() {
    this.set = {};
  }

  /**
   * @param {!K} item
   * @param {V} val
   */
  add(item, val) {
    this.set[item] = val !== null ? val : true;
  }

  /**
   * @param {!K} key
   * @return {boolean}
   */
  contains(key) {
    return contains(this.set, key);
  }

  /**
   * @param {!K} item
   * @return {V}
   */
  get(item) {
    return this.contains(item) ? this.set[item] : undefined;
  }

  /**
   * @param {!K} item
   */
  remove(item) {
    delete this.set[item];
  }

  /**
   * Deletes everything in the set
   */
  clear() {
    this.set = {};
  }

  /**
   * True if there's nothing in the set
   * @return {boolean}
   */
  isEmpty() {
    return isEmpty(this.set);
  }

  /**
   * @return {number} The number of items in the set
   */
  count() {
    return getCount(this.set);
  }

  /**
   * Run a function on each k,v pair in the set
   * @param {function(K, V)} fn
   */
  each(fn) {
    forEach(this.set, function(v, k) {
      fn(k, v);
    });
  }

  /**
   * Mostly for debugging
   * @return {Array.<K>} The keys present in this CountedSet
   */
  keys() {
    var keys = [];
    forEach(this.set, function(v, k) {
      keys.push(k);
    });
    return keys;
  }
}; // end fb.core.util.CountedSet
