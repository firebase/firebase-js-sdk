/**
 * Copyright 2018 Google Inc.
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

goog.provide('fireauth.storage.HybridIndexedDB');

goog.require('fireauth.storage.IndexedDB');
goog.require('fireauth.storage.Storage');
goog.require('goog.Promise');
goog.require('goog.array');

/**
 * HybridStorage provides an interface to indexedDB, the persistent Web
 * Storage API for browsers that support it. This will fallback to the provided
 * fallback storage when indexedDB is not supported which is determined
 * asynchronously.
 * @param {!fireauth.storage.Storage} fallbackStorage The storage to fallback to
 *     when indexedDB is not available.
 * @constructor
 * @implements {fireauth.storage.Storage}
 */
fireauth.storage.HybridIndexedDB = function(fallbackStorage) {
  var self = this;
  var storage = null;
  /**
   * @const @private {!Array<function((!goog.events.BrowserEvent|
   *                                   !Array<string>))>} The storage listeners.
   */
  this.storageListeners_ = [];
  // This type may change if the fallback is used.
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.INDEXEDDB;
  /**
   * @const @private {!fireauth.storage.Storage} The fallback storage when
   *     indexedDB is unavailable.
   */
  this.fallbackStorage_ = fallbackStorage;
  /**
   * @const @private {!goog.Promise<!fireauth.storage.Storage>} A promise that
   *     resolves with the underlying indexedDB storage or a fallback when not
   *     supported.
   */
  this.underlyingStoragePromise_ = goog.Promise.resolve().then(function() {
    // Initial check shows indexedDB is available. This is not enough.
    // Try to write/read from indexedDB. If it fails, switch to fallback.
    if (fireauth.storage.IndexedDB.isAvailable()) {
      storage = fireauth.storage.IndexedDB.getFireauthManager();
      return storage.set(fireauth.storage.HybridIndexedDB.KEY_, '!')
          .then(function() {
            return storage.get(fireauth.storage.HybridIndexedDB.KEY_);
          })
          .then(function(value) {
            if (value !== '!') {
              throw new Error('indexedDB not supported!');
            }
            return storage.remove(fireauth.storage.HybridIndexedDB.KEY_);
          })
          .then(function() {
            return storage;
          })
          .thenCatch(function(error) {
            return self.fallbackStorage_;
          });
    } else {
      // indexedDB not available, use fallback.
      return self.fallbackStorage_;
    }
  }).then(function(storage) {
    // Update type.
    self.type = storage.type;
    // Listen to all storage changes.
    storage.addStorageListener(function(key) {
      // Trigger all attached storage listeners.
      goog.array.forEach(self.storageListeners_, function(listener) {
        listener(key);
      });
    });
    return storage;
  });
};


/**
 * The key used to check if the storage instance is available.
 * @private {string}
 * @const
 */
fireauth.storage.HybridIndexedDB.KEY_ = '__sak';


/**
 * Retrieves the value stored at the key.
 * @param {string} key
 * @return {!goog.Promise<*>}
 * @override
 */
fireauth.storage.HybridIndexedDB.prototype.get = function(key) {
  return this.underlyingStoragePromise_.then(function(storage) {
    return storage.get(key);
  });
};


/**
 * Stores the value at the specified key.
 * @param {string} key
 * @param {*} value
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.HybridIndexedDB.prototype.set = function(key, value) {
  return this.underlyingStoragePromise_.then(function(storage) {
    return storage.set(key, value);
  });
};


/**
 * Removes the value at the specified key.
 * @param {string} key
 * @return {!goog.Promise<void>}
 * @override
 */
fireauth.storage.HybridIndexedDB.prototype.remove = function(key) {
  return this.underlyingStoragePromise_.then(function(storage) {
    return storage.remove(key);
  });
};


/**
 * Adds a listener to storage event change.
 * @param {function((!goog.events.BrowserEvent|!Array<string>))} listener The
 *     storage event listener.
 * @override
 */
fireauth.storage.HybridIndexedDB.prototype.addStorageListener =
    function(listener) {
  this.storageListeners_.push(listener);
};


/**
 * Removes a listener to storage event change.
 * @param {function(!goog.events.BrowserEvent)} listener The storage event
 *     listener.
 * @override
 */
fireauth.storage.HybridIndexedDB.prototype.removeStorageListener =
    function(listener) {
  goog.array.removeAllIf(this.storageListeners_, function(ele) {
    return ele == listener;
  });
};
