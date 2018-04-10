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

goog.provide('fireauth.storage.LocalStorage');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.events');



/**
 * LocalStorage provides an interface to localStorage, the persistent Web
 * Storage API.
 * @constructor
 * @implements {fireauth.storage.Storage}
 */
fireauth.storage.LocalStorage = function() {
  // Check is localStorage available in the current environment.
  if (!fireauth.storage.LocalStorage.isAvailable()) {
    // In a Node.js environment, dom-storage module needs to be required.
    if (fireauth.util.getEnvironment() == fireauth.util.Env.NODE) {
      throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
          'The LocalStorage compatibility library was not found.');
    }
    throw new fireauth.AuthError(
        fireauth.authenum.Error.WEB_STORAGE_UNSUPPORTED);
  }

  /**
   * The underlying storage instance for persistent data.
   * @private {!Storage}
   */
  this.storage_ = /** @type {!Storage} */ (
      fireauth.storage.LocalStorage.getGlobalStorage() ||
      firebase.INTERNAL['node']['localStorage']);
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.LOCAL_STORAGE;
};


/** @return {?Storage|undefined} The global localStorage instance. */
fireauth.storage.LocalStorage.getGlobalStorage = function() {
  try {
    var storage = goog.global['localStorage'];
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
fireauth.storage.LocalStorage.STORAGE_AVAILABLE_KEY_ = '__sak';


/** @return {boolean} Whether localStorage is available. */
fireauth.storage.LocalStorage.isAvailable = function() {
  // In Node.js localStorage is polyfilled.
  var isNode = fireauth.util.getEnvironment() == fireauth.util.Env.NODE;
  // Either window should provide this storage mechanism or in case of Node.js,
  // firebase.INTERNAL should provide it.
  var storage = fireauth.storage.LocalStorage.getGlobalStorage() ||
      (isNode &&
       firebase.INTERNAL['node'] &&
       firebase.INTERNAL['node']['localStorage']);
  if (!storage) {
    return false;
  }
  try {
    // setItem will throw an exception if we cannot access web storage (e.g.,
    // Safari in private mode).
    storage.setItem(fireauth.storage.LocalStorage.STORAGE_AVAILABLE_KEY_, '1');
    storage.removeItem(fireauth.storage.LocalStorage.STORAGE_AVAILABLE_KEY_);
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
fireauth.storage.LocalStorage.prototype.get = function(key) {
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
fireauth.storage.LocalStorage.prototype.set = function(key, value) {
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
fireauth.storage.LocalStorage.prototype.remove = function(key) {
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
fireauth.storage.LocalStorage.prototype.addStorageListener = function(
    listener) {
  if (goog.global['window']) {
    goog.events.listen(goog.global['window'], 'storage', listener);
  }
};


/**
 * Removes a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.LocalStorage.prototype.removeStorageListener = function(
    listener) {
  if (goog.global['window']) {
    goog.events.unlisten(goog.global['window'], 'storage', listener);
  }
};
