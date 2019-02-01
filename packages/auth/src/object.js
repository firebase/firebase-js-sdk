/**
 * @license
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

/**
 * @fileoverview Provides methods for manipulating objects.
 */

goog.provide('fireauth.object');

goog.require('fireauth.deprecation');
goog.require('fireauth.deprecation.Deprecations');


/**
 * Checks whether the defineProperty method allows to change the value of
 * the property.
 * @return {boolean} Whether the defineProperty method allows to change the
 *    value of the property.
 * @private
 */
fireauth.object.isReadonlyConfigurable_ = function() {
  // Android 2.3 stock browser doesn't allow to change the value of
  // a read-only property once defined.
  try {
    var obj = {};
    Object.defineProperty(obj, 'abcd', {
      configurable: true,
      enumerable: true,
      value: 1
    });
    Object.defineProperty(obj, 'abcd', {
      configurable: true,
      enumerable: true,
      value: 2
    });
    return obj['abcd'] == 2;
  } catch (e) {
    return false;
  }
};


/**
 * @private {boolean} Whether the defineProperty method allows to change the
 *     value of the property.
 */
fireauth.object.readonlyConfigurable_ =
    fireauth.object.isReadonlyConfigurable_();


/**
 * Defines a property on an object that is not writable by clients. However, the
 * property can be overwritten within the Firebase library through subsequent
 * calls to setReadonlyProperty.
 *
 * In browsers that do not support read-only properties (notably IE8 and below),
 * fall back to writable properties.
 *
 * @param {!Object} obj The object to which we add the property.
 * @param {string} key The name of the property.
 * @param {*} value The desired value.
 */
fireauth.object.setReadonlyProperty = function(obj, key, value) {
  if (fireauth.object.readonlyConfigurable_) {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      value: value
    });
  } else {
    obj[key] = value;
  }
};


/**
 * Defines a deprecated property, which emits a warning if the developer tries
 * to use it.
 *
 * In browsers that do not support getters, we fall back to a normal property
 * with no message.
 *
 * @param {!Object} obj The object to which we add the property.
 * @param {string} key The name of the deprecated property.
 * @param {*} value The desired value.
 * @param {!fireauth.deprecation.Deprecations} deprecationMessage The
 *     deprecation warning to display.
 */
fireauth.object.setDeprecatedReadonlyProperty = function(obj, key, value,
    deprecationMessage) {
  if (fireauth.object.readonlyConfigurable_) {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: true,
      get: function() {
        fireauth.deprecation.log(deprecationMessage);
        return value;
      }
    });
  } else {
    obj[key] = value;
  }
};


/**
 * Defines properties on an object that are not writable by clients, equivalent
 * to many calls to setReadonlyProperty.
 * @param {!Object} obj The object to which we add the properties.
 * @param {?Object<string, *>} props An object that maps the keys and values
 *     that we wish to add.
 */
fireauth.object.setReadonlyProperties = function(obj, props) {
  if (!props) {
    return;
  }

  for (var key in props) {
    if (props.hasOwnProperty(key)) {
      fireauth.object.setReadonlyProperty(obj, key, props[key]);
    }
  }
};


/**
 * Makes a shallow read-only copy of an object. The writability of any child
 * objects will not be affected.
 * @param {?Object} obj The object that we wish to copy.
 * @return {!Object}
 */
fireauth.object.makeReadonlyCopy = function(obj) {
  var output = {};
  fireauth.object.setReadonlyProperties(output, obj);
  return output;
};


/**
 * Makes a shallow writable copy of a read-only object. The writability of any
 * child objects will not be affected.
 * @param {?Object} obj The object that we wish to copy.
 * @return {!Object}
 */
fireauth.object.makeWritableCopy = function(obj) {
  var output = {};
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      output[key] = obj[key];
    }
  }
  return output;
};


/**
 * Returns true if the all the specified fields are present in obj and are not
 * null, undefined, or the empty string. If the field list is empty, returns
 * true regardless of the value of obj.
 * @param {?Object=} opt_obj The object.
 * @param {?Array<string>=} opt_fields The desired fields of the object.
 * @return {boolean} True if obj has all the specified fields.
 */
fireauth.object.hasNonEmptyFields = function(opt_obj, opt_fields) {
  if (!opt_fields || !opt_fields.length) {
    return true;
  }
  if (!opt_obj) {
    return false;
  }
  for (var i = 0; i < opt_fields.length; i++) {
    var field = opt_obj[opt_fields[i]];
    if (field === undefined || field === null || field === '') {
      return false;
    }
  }
  return true;
};


/**
 * Traverses the specified object and creates a read-only deep copy of it.
 * This will fail when circular references are contained within the object.
 * @param {*} obj The object to make a read-only copy from.
 * @return {*} A Read-only copy of the obj specified.
 */
fireauth.object.unsafeCreateReadOnlyCopy = function(obj) {
  var copy = obj;
  if (typeof obj == 'object' && obj != null) {
    // Make the right type of copy.
    copy = 'length' in obj ? [] : {};
    // Make a deep copy.
    for (var key in obj) {
      fireauth.object.setReadonlyProperty(
          copy, key, fireauth.object.unsafeCreateReadOnlyCopy(obj[key]));
    }
  }
  // Return the copy.
  return copy;
};

