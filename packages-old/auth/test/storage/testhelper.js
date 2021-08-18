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
 * @fileoverview Provides utilities for testing storage.
 */
goog.provide('fireauth.storage.testHelper');
goog.provide('fireauth.storage.testHelper.FakeAsyncStorage');
goog.setTestOnly('fireauth.storage.testHelper');

goog.require('goog.Promise');


/**
 * Provides a fake implementation of the React Native AsyncStorage API. It
 * currently does not implement all of the APIs.
 * @constructor
 * @see https://facebook.github.io/react-native/docs/asyncstorage.html
 */
fireauth.storage.testHelper.FakeAsyncStorage = function() {
  /** @private {!Object} */
  this.storage_ = {};
};


/**
 * @param {string} key
 * @return {!goog.Promise}
 */
fireauth.storage.testHelper.FakeAsyncStorage.prototype.getItem =
    function(key) {
  return goog.Promise.resolve(this.storage_[key]);
};


/**
 * @param {string} key
 * @param {string} value
 * @return {!goog.Promise}
 */
fireauth.storage.testHelper.FakeAsyncStorage.prototype.setItem =
    function(key, value) {
  this.storage_[key] = value;
  return goog.Promise.resolve();
};


/**
 * @param {string} key
 * @return {!goog.Promise}
 */
fireauth.storage.testHelper.FakeAsyncStorage.prototype.removeItem =
    function(key) {
  delete this.storage_[key];
  return goog.Promise.resolve();
};


var storageFirebaseExtension = {
  'INTERNAL': {
    'reactNative': {
      'AsyncStorage': new fireauth.storage.testHelper.FakeAsyncStorage()
    },
    'node': {
      'localStorage': window.localStorage,
      'sessionStorage': window.sessionStorage,
    }
  }
};


if (!goog.global['firebase'] || !goog.global['firebase']['INTERNAL']) {
  goog.global['firebase'] = storageFirebaseExtension;
} else {
  goog.global['firebase']['INTERNAL']['extendNamespace'](
      storageFirebaseExtension);
}


/**
 * Asserts that two errors are equivalent. Plain assertObjectEquals cannot be
 * used as Internet Explorer adds the stack trace as a property of the object.
 * @param {!fireauth.AuthError} expected
 * @param {!fireauth.AuthError} actual
 */
function assertErrorEquals(expected, actual) {
  assertObjectEquals(expected.toPlainObject(), actual.toPlainObject());
}


/**
 * @param {!fireauth.storage.Storage} storage
 * @return {!goog.Promise}
 */
function assertBasicStorageOperations(storage) {
  return goog.Promise.resolve()
      .then(function() { return storage.get('foo'); })
      .then(function(value) {
        assertUndefined(value);
        return storage.set('foo', 'bar');
      })
      .then(function() { return storage.get('foo'); })
      .then(function(value) {
        assertEquals('bar', value);
        return storage.remove('foo');
      })
      .then(function() { return storage.get('foo'); })
      .then(function(value) { assertUndefined(value); });
}


/**
 * @param {!fireauth.storage.Storage} storage
 * @return {!goog.Promise}
 */
function assertDifferentTypes(storage) {
  var obj = {'a': 1.2, 'b': 'foo'};
  var num = 54;
  var bool = true;
  return goog.Promise.resolve()
      .then(function() {
        return goog.Promise.all([
          storage.set('obj', obj), storage.set('num', num),
          storage.set('bool', bool), storage.set('null', null)
        ]);
      })
      .then(function() {
        return goog.Promise.all([
          storage.get('obj'), storage.get('num'), storage.get('bool'),
          storage.get('null'), storage.get('undefined')
        ]);
      })
      .then(function(values) {
        assertObjectEquals(obj, values[0]);
        assertEquals(num, values[1]);
        assertEquals(bool, values[2]);
        assertNull(values[3]);
      });
}
