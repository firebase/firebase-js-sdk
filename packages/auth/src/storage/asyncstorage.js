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

goog.provide('fireauth.storage.AsyncStorage');

goog.require('fireauth.AuthError');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.Promise');


/**
 * AsyncStorage provides an interface to the React Native AsyncStorage API.
 * @param {!Object=} opt_asyncStorage The AsyncStorage API. If not provided
 *     this method will attempt to fetch an implementation from
 *     firebase.INTERNAL.reactNative.
 * @constructor
 * @implements {fireauth.storage.Storage}
 * @see https://facebook.github.io/react-native/docs/asyncstorage.html
 */
fireauth.storage.AsyncStorage = function(opt_asyncStorage) {
  /**
   * The underlying storage instance for persistent data.
   * @private
   */
  this.storage_ =
      opt_asyncStorage || (firebase.INTERNAL['reactNative'] &&
                           firebase.INTERNAL['reactNative']['AsyncStorage']);

  if (!this.storage_) {
    throw new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR,
        'The React Native compatibility library was not found.');
  }
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.ASYNC_STORAGE;
};


/**
 * Retrieves the value stored at the key.
 * @param {string} key
 * @return {!goog.Promise<*>}
 * @override
 */
fireauth.storage.AsyncStorage.prototype.get = function(key) {
  return goog.Promise.resolve(this.storage_['getItem'](key))
      .then(function(val) {
        return val && fireauth.util.parseJSON(val);
      });
};


/**
 * Stores the value at the specified key.
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.AsyncStorage.prototype.set = function(key, value) {
  return goog.Promise.resolve(
      this.storage_['setItem'](key, fireauth.util.stringifyJSON(value)));
};


/**
 * Removes the value at the specified key.
 * @param {string} key
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.AsyncStorage.prototype.remove = function(key) {
  return goog.Promise.resolve(this.storage_['removeItem'](key));
};


/**
 * Does nothing. AsyncStorage does not support storage events,
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.AsyncStorage.prototype.addStorageListener = function(
    listener) {};


/**
 * Does nothing. AsyncStorage does not support storage events,
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.AsyncStorage.prototype.removeStorageListener = function(
    listener) {};
