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

// See http://www.devthought.com/2012/01/18/an-object-is-not-a-hash/

export const contains = function(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

export const safeGet = function(obj, key) {
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  // else return undefined.
};

/**
 * Enumerates the keys/values in an object, excluding keys defined on the prototype.
 *
 * @param {?Object.<K,V>} obj Object to enumerate.
 * @param {!function(K, V)} fn Function to call for each key and value.
 * @template K,V
 */
export const forEach = function(obj, fn) {
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      fn(key, obj[key]);
    }
  }
};

/**
 * Copies all the (own) properties from one object to another.
 * @param {!Object} objTo
 * @param {!Object} objFrom
 * @return {!Object} objTo
 */
export const extend = function(objTo, objFrom) {
  forEach(objFrom, function(key, value) {
    objTo[key] = value;
  });
  return objTo;
};

/**
 * Returns a clone of the specified object.
 * @param {!Object} obj
 * @return {!Object} cloned obj.
 */
export const clone = function(obj) {
  return extend({}, obj);
};

/**
 * Returns true if obj has typeof "object" and is not null.  Unlike goog.isObject(), does not return true
 * for functions.
 *
 * @param obj {*} A potential object.
 * @returns {boolean} True if it's an object.
 */
export const isNonNullObject = function(obj) {
  return typeof obj === 'object' && obj !== null;
};

export const isEmpty = function(obj) {
  for (var key in obj) {
    return false;
  }
  return true;
};

export const getCount = function(obj) {
  var rv = 0;
  for (var key in obj) {
    rv++;
  }
  return rv;
};

export const map = function(obj, f, opt_obj?) {
  var res = {};
  for (var key in obj) {
    res[key] = f.call(opt_obj, obj[key], key, obj);
  }
  return res;
};

export const findKey = function(obj, fn, opt_this?) {
  for (var key in obj) {
    if (fn.call(opt_this, obj[key], key, obj)) {
      return key;
    }
  }
  return undefined;
};

export const findValue = function(obj, fn, opt_this?) {
  var key = findKey(obj, fn, opt_this);
  return key && obj[key];
};

export const getAnyKey = function(obj) {
  for (var key in obj) {
    return key;
  }
};

export const getValues = function(obj) {
  var res = [];
  var i = 0;
  for (var key in obj) {
    res[i++] = obj[key];
  }
  return res;
};

/**
 * Tests whether every key/value pair in an object pass the test implemented
 * by the provided function
 *
 * @param {?Object.<K,V>} obj Object to test.
 * @param {!function(K, V)} fn Function to call for each key and value.
 * @template K,V
 */
export const every = function<V>(
  obj: Object,
  fn: (k: string, v?: V) => boolean
): boolean {
  for (let key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (!fn(key, obj[key])) {
        return false;
      }
    }
  }
  return true;
};
