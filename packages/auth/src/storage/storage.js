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

goog.provide('fireauth.storage.Storage');



/**
 * Defines a generic interface to storage APIs across platforms.
 * @interface
 */
fireauth.storage.Storage = function() {};


/**
 * Retrieves the value stored at the key.
 * @param {string} key
 * @return {!goog.Promise<*>}
 */
fireauth.storage.Storage.prototype.get = function(key) {};


/**
 * Stores the value at the specified key.
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 */
fireauth.storage.Storage.prototype.set = function(key, value) {};


/**
 * Removes the value at the specified key.
 * @param {string} key
 * @return {!goog.Promise<void>}
 */
fireauth.storage.Storage.prototype.remove = function(key) {};


/**
 * Adds a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)|function(!Array<string>)}
 *     listener The storage event listener.
 */
fireauth.storage.Storage.prototype.addStorageListener = function(listener) {};


/**
 * Removes a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)|function(!Array<string>)}
 *     listener The storage event listener.
 */
fireauth.storage.Storage.prototype.removeStorageListener = function(listener) {
};


/** @type {string} The storage type identifier. */
fireauth.storage.Storage.prototype.type;


/**
 * Enum for the identifier of the type of underlying storage.
 * @enum {string}
 */
fireauth.storage.Storage.Type = {
  ASYNC_STORAGE: 'asyncStorage',
  IN_MEMORY: 'inMemory',
  INDEXEDDB: 'indexedDB',
  LOCAL_STORAGE: 'localStorage',
  MOCK_STORAGE: 'mockStorage',
  NULL_STORAGE: 'nullStorage',
  SESSION_STORAGE: 'sessionStorage'
};
