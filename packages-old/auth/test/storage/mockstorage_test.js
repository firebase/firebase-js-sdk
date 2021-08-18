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

goog.provide('fireauth.storage.MockStorageTest');

goog.require('fireauth.storage.MockStorage');
goog.require('fireauth.storage.Storage');
/** @suppress {extraRequire} */
goog.require('fireauth.storage.testHelper');
goog.require('goog.events.EventType');
goog.require('goog.testing.events');
goog.require('goog.testing.events.Event');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.storage.MockStorageTest');


var storage;


function setUp() {
  storage = new fireauth.storage.MockStorage();
}


function tearDown() {
  storage = null;
}


function testBasicStorageOperations() {
  assertEquals(fireauth.storage.Storage.Type.MOCK_STORAGE, storage.type);
  return assertBasicStorageOperations(storage);
}


function testDifferentTypes() {
  return assertDifferentTypes(storage);
}


function testListeners() {
  var storageEvent;

  var listener1 = goog.testing.recordFunction();
  var listener2 = goog.testing.recordFunction();
  var listener3 = goog.testing.recordFunction();

  storage.addStorageListener(listener1);
  storage.addStorageListener(listener3);

  storageEvent =
      new goog.testing.events.Event(goog.events.EventType.STORAGE, window);
  storageEvent.key = 'myKey1';
  storageEvent.newValue = JSON.stringify('value1');
  storage.fireBrowserEvent(storageEvent);

  assertEquals(1, listener1.getCallCount());
  assertEquals(1, listener3.getCallCount());
  assertEquals(0, listener2.getCallCount());
  return storage.get('myKey1').then(function(value) {
    assertEquals('value1', value);

    storage.removeStorageListener(listener3);

    storageEvent.key = 'myKey2';
    storageEvent.newValue = JSON.stringify('value2');
    storage.fireBrowserEvent(storageEvent);

    assertEquals(2, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());
    return storage.get('myKey2');
  }).then(function(value) {
    assertEquals('value2', value);
    storageEvent.key = 'myKey1';
    storageEvent.newValue = null;
    storage.fireBrowserEvent(storageEvent);

    assertEquals(3, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());

    return storage.get('myKey1');
  }).then(function(value) {
    assertUndefined(value);

    storage.removeStorageListener(listener1);

    storageEvent.key = null;
    storage.fireBrowserEvent(storageEvent);

    assertEquals(3, listener1.getCallCount());
    assertEquals(1, listener3.getCallCount());
    assertEquals(0, listener2.getCallCount());

    return storage.get('myKey2');
  }).then(function(value) {
    assertUndefined(value);
  });
}


function testClear() {
  storage.set('myKey1', 'value1');
  storage.set('myKey2', 'value2');
  storage.clear();
  return storage.get('myKey1').then(function(value) {
    assertUndefined(value);
    return storage.get('myKey2');
  }).then(function(value) {
    assertUndefined(value);
  });
}
