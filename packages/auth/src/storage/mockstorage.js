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

goog.provide('fireauth.storage.MockStorage');

goog.require('fireauth.storage.InMemoryStorage');
goog.require('fireauth.storage.Storage');
goog.require('fireauth.util');
goog.require('goog.array');


/**
 * Mock storage structure useful for testing and mocking local storage and other
 * types of storage without depending on any native type of storage.
 * @constructor
 * @implements {fireauth.storage.Storage}
 * @extends {fireauth.storage.InMemoryStorage}
 */
fireauth.storage.MockStorage = function() {
  /**
   * @private {!Array<function((!goog.events.BrowserEvent|!Array<string>))>} The
   *     storage listeners.
   */
  this.storageListeners_ = [];
  fireauth.storage.MockStorage.base(this, 'constructor');
  /** @public {string} The storage type identifier. */
  this.type = fireauth.storage.Storage.Type.MOCK_STORAGE;
};
goog.inherits(fireauth.storage.MockStorage, fireauth.storage.InMemoryStorage);


/**
 * @param {function((!goog.events.BrowserEvent|!Array<string>))} listener The
 *     storage event listener.
 * @override
 */
fireauth.storage.MockStorage.prototype.addStorageListener = function(listener) {
  this.storageListeners_.push(listener);
};


/**
 * @param {function((!goog.events.BrowserEvent|!Array<string>))} listener The
 *     storage event listener.
 * @override
 */
fireauth.storage.MockStorage.prototype.removeStorageListener = function(
    listener) {
  goog.array.removeAllIf(this.storageListeners_, function(ele) {
    return ele == listener;
  });
};


/**
 * Simulates a storage event getting triggered which would trigger any attached
 * listener. Any fired event would also update the underlying storage map.
 * @param {!Event} storageEvent The storage event triggered.
 */
fireauth.storage.MockStorage.prototype.fireBrowserEvent =
    function(storageEvent) {
  // Get key of storage event.
  var key = storageEvent.key;
  if (key != null) {
    // If key available, get newValue.
    var newValue = storageEvent.newValue;
    if (newValue != null) {
      // newValue available, update corresponding value.
      this.storage[key] = fireauth.util.parseJSON(newValue);
    } else {
      // newValue not available, delete the corresponding key's entry.
      delete this.storage[key];
    }
  } else {
    // If key not available, clear storage.
    this.clear();
  }
  // Trigger all attached storage listeners.
  goog.array.forEach(this.storageListeners_, function(listener) {
    listener([key]);
  });
};


/** Clears all stored data. */
fireauth.storage.MockStorage.prototype.clear = function() {
  this.storage = {};
};
