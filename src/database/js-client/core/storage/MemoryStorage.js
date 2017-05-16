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
goog.provide('fb.core.storage.MemoryStorage');
goog.require('fb.util.obj');

goog.scope(function() {
  var obj = fb.util.obj;

  /**
   * An in-memory storage implementation that matches the API of DOMStorageWrapper
   * (TODO: create interface for both to implement).
   *
   * @constructor
   */
  fb.core.storage.MemoryStorage = function() {
    this.cache_ = {};
  };
  var MemoryStorage = fb.core.storage.MemoryStorage;

  MemoryStorage.prototype.set = function(key, value) {
    if (value == null) {
      delete this.cache_[key];
    } else {
      this.cache_[key] = value;
    }
  };

  MemoryStorage.prototype.get = function(key) {
    if (obj.contains(this.cache_, key)) {
      return this.cache_[key];
    }
    return null;
  };

  MemoryStorage.prototype.remove = function(key) {
    delete this.cache_[key];
  };

  MemoryStorage.prototype.isInMemoryStorage = true;
});
