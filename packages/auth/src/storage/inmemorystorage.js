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

goog.provide('fireauth.storage.InMemoryStorage');

goog.require('goog.Promise');



/**
 * InMemoryStorage provides an implementation of Storage that will only persist
 * data in memory. This data is volatile and in a browser environment, will
 * be lost on page unload and will only be available in the current window.
 * This is a useful fallback for browsers where web storage is disabled or
 * environments where the preferred storage mechanism is not available or not
 * supported.
 * @constructor
 * @implements {fireauth.storage.Storage}
 */
fireauth.storage.InMemoryStorage = function() {
  /** @protected {!Object} The object where we store values. */
  this.storage = {};
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.IN_MEMORY;
};


/**
 * @param {string} key
 * @return {!goog.Promise<*>}
 * @override
 */
fireauth.storage.InMemoryStorage.prototype.get = function(key) {
  return goog.Promise.resolve(/** @type {*} */ (this.storage[key]));
};


/**
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.InMemoryStorage.prototype.set = function(key, value) {
  this.storage[key] = value;
  return goog.Promise.resolve();
};


/**
 * @param {string} key
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.InMemoryStorage.prototype.remove = function(key) {
  delete this.storage[key];
  return goog.Promise.resolve();
};


/**
 * @param {function((!goog.events.BrowserEvent|!Array<string>))} listener The
 *     storage event listener.
 * @override
 */
fireauth.storage.InMemoryStorage.prototype.addStorageListener =
    function(listener) {
};


/**
 * @param {function((!goog.events.BrowserEvent|!Array<string>))} listener The
 *     storage event listener.
 * @override
 */
fireauth.storage.InMemoryStorage.prototype.removeStorageListener = function(
    listener) {};
