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

goog.provide('fireauth.storage.NullStorageTest');

goog.require('fireauth.storage.NullStorage');
goog.require('fireauth.storage.Storage');
goog.require('goog.Promise');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.storage.NullStorageTest');



function testNullStorage() {
  var storage = new fireauth.storage.NullStorage();
  var listener = function() {};
  assertEquals(fireauth.storage.Storage.Type.NULL_STORAGE, storage.type);
  storage.addStorageListener(listener);
  storage.removeStorageListener(listener);
  return goog.Promise.resolve()
      .then(function() { return storage.set('foo', 'bar'); })
      .then(function() { return storage.get('foo'); })
      .then(function(value) {
        assertNull(value);
        return storage.remove('foo');
      });
}
