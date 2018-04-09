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

goog.provide('fireauth.storage.NullStorage');

goog.require('fireauth.storage.Storage');
goog.require('goog.Promise');



/**
 * NullStorage provides an implementation of Storage that does always returns
 * null. This can be used if a type of storage is unsupported on a platform.
 * @constructor
 * @implements {fireauth.storage.Storage}
 */
fireauth.storage.NullStorage = function() {
  /** @private {!Object} The object where we store values. */
  this.storage_ = {};
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.NULL_STORAGE;
};


/**
 * @param {string} key
 * @return {!goog.Promise<*>}
 * @override
 */
fireauth.storage.NullStorage.prototype.get = function(key) {
  return goog.Promise.resolve(/** @type {*} */ (null));
};


/**
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.NullStorage.prototype.set = function(key, value) {
  return goog.Promise.resolve();
};


/**
 * @param {string} key
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.NullStorage.prototype.remove = function(key) {
  return goog.Promise.resolve();
};


/**
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.NullStorage.prototype.addStorageListener = function(listener) {
};


/**
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.NullStorage.prototype.removeStorageListener = function(
    listener) {};
