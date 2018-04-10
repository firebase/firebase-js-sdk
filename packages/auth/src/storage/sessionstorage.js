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

goog.provide('fireauth.storage.SessionStorage');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.Promise');



/**
 * SessionStorage provides an interface to sessionStorage, the temporary web
 * storage API.
 * @constructor
 * @implements {fireauth.storage.Storage}
 */
fireauth.storage.SessionStorage = function() {
  // Check is sessionStorage available in the current environment.
  if (!fireauth.storage.SessionStorage.isAvailable()) {
    // In a Node.js environment, dom-storage module needs to be required.
    if (fireauth.util.getEnvironment() == fireauth.util.Env.NODE) {
      throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
          'The SessionStorage compatibility library was not found.');
    }
    throw new fireauth.AuthError(
        fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  }

  /**
   * The underlying storage instance for temporary data.
   * @private {!Storage}
   */
  this.storage_ = /** @type {!Storage} */ (
      fireauth.storage.SessionStorage.getGlobalStorage() ||
      firebase.INTERNAL['node']['sessionStorage']);
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.SESSION_STORAGE;
};


/** @return {?Storage|undefined} The global sessionStorage instance. */
fireauth.storage.SessionStorage.getGlobalStorage = function() {
  try {
    var storage = goog.global['sessionStorage'];
    // Try editing web storage. If an error is thrown, it may be disabled.
    var key = fireauth.util.generateEventId();
    if (storage) {
      storage['setItem'](key, '1');
      storage['removeItem'](key);
    }
    return storage;
  } catch (e) {
    // In some cases, browsers with web storage disabled throw an error simply
    // on access.
    return null;
  }
};


/**
 * The key used to check if the storage instance is available.
 * @private {string}
 * @const
 */
fireauth.storage.SessionStorage.STORAGE_AVAILABLE_KEY_ = '__sak';


/** @return {boolean} Whether sessionStorage is available. */
fireauth.storage.SessionStorage.isAvailable = function() {
  // In Node.js sessionStorage is polyfilled.
  var isNode = fireauth.util.getEnvironment() == fireauth.util.Env.NODE;
  // Either window should provide this storage mechanism or in case of Node.js,
  // firebase.INTERNAL should provide it.
  var storage = fireauth.storage.SessionStorage.getGlobalStorage() ||
      (isNode &&
       firebase.INTERNAL['node'] &&
       firebase.INTERNAL['node']['sessionStorage']);
  if (!storage) {
    return false;
  }
  try {
    // setItem will throw an exception if we cannot access web storage (e.g.,
    // Safari in private mode).
    storage.setItem(
        fireauth.storage.SessionStorage.STORAGE_AVAILABLE_KEY_, '1');
    storage.removeItem(fireauth.storage.SessionStorage.STORAGE_AVAILABLE_KEY_);
    return true;
  } catch (e) {
    return false;
  }
};


/**
 * Retrieves the value stored at the key.
 * @param {string} key
 * @return {!goog.Promise<*>}
 * @override
 */
fireauth.storage.SessionStorage.prototype.get = function(key) {
  var self = this;
  return goog.Promise.resolve()
      .then(function() {
        var json = self.storage_.getItem(key);
        return fireauth.util.parseJSON(json);
      });
};


/**
 * Stores the value at the specified key.
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.SessionStorage.prototype.set = function(key, value) {
  var self = this;
  return goog.Promise.resolve()
      .then(function() {
        var obj = fireauth.util.stringifyJSON(value);
        if (goog.isNull(obj)) {
          self.remove(key);
        } else {
          self.storage_.setItem(key, obj);
        }
      });
};


/**
 * Removes the value at the specified key.
 * @param {string} key
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.SessionStorage.prototype.remove = function(key) {
  var self = this;
  return goog.Promise.resolve()
      .then(function() {
        self.storage_.removeItem(key);
      });
};


/**
 * Adds a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.SessionStorage.prototype.addStorageListener = function(
    listener) {};


/**
 * Removes a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.SessionStorage.prototype.removeStorageListener = function(
    listener) {};
