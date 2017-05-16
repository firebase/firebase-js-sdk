/**
* Copyright 2017 Google Inc.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
goog.provide('fb.core.util.CountedSet');
goog.require('fb.core.util');
goog.require('fb.util.obj');
goog.require('goog.object');


/**
 * Implements a set with a count of elements.
 *
 */
fb.core.util.CountedSet = goog.defineClass(null, {
  /**
   * @template K, V
   */
  constructor: function() {
    this.set = {};
  },

  /**
   * @param {!K} item
   * @param {V} val
   */
  add: function(item, val) {
    this.set[item] = val !== null ? val : true;
  },

  /**
   * @param {!K} key
   * @return {boolean}
   */
  contains: function(key) {
    return fb.util.obj.contains(this.set, key);
  },

  /**
   * @param {!K} item
   * @return {V}
   */
  get: function(item) {
    return this.contains(item) ? this.set[item] : undefined;
  },

  /**
   * @param {!K} item
   */
  remove: function(item) {
    delete this.set[item];
  },

  /**
   * Deletes everything in the set
   */
  clear: function() {
    this.set = {};
  },

  /**
   * True if there's nothing in the set
   * @return {boolean}
   */
  isEmpty: function() {
    return goog.object.isEmpty(this.set);
  },

  /**
   * @return {number} The number of items in the set
   */
  count: function() {
    return goog.object.getCount(this.set);
  },

  /**
   * Run a function on each k,v pair in the set
   * @param {function(K, V)} fn
   */
  each: function(fn) {
    goog.object.forEach(this.set, function(v, k) {
      fn(k, v);
    });
  },

  /**
   * Mostly for debugging
   * @return {Array.<K>} The keys present in this CountedSet
   */
  keys: function() {
    var keys = [];
    goog.object.forEach(this.set, function(v, k) {
      keys.push(k);
    });
    return keys;
  }
}); // end fb.core.util.CountedSet
