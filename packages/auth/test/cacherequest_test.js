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

/**
 * @fileoverview Tests for cacherequest.js.
 */

goog.provide('fireauth.CacheRequestTest');

goog.require('fireauth.CacheRequest');
goog.require('goog.Promise');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.TestCase');
goog.require('goog.testing.jsunit');

goog.setTestOnly('fireauth.CacheRequestTest');


var cacheRequest;
var MyClass;
var instance;
var clock;

function setUp() {
  // Test class.
  MyClass = function() {
    this.counter = 0;
    this.err = 0;
  };
  // Method that always resolves with an incremented counter.
  MyClass.prototype.func = function(par1, par2) {
    assertEquals(1, par1);
    assertEquals(2, par2);
    this.counter++;
    return goog.Promise.resolve(this.counter);
  };
  // Method that always rejects with an incremented error message.
  MyClass.prototype.func2 = function(par1, par2) {
    assertEquals(1, par1);
    assertEquals(2, par2);
    this.err++;
    return goog.Promise.reject(new Error(this.err));
  };
  instance = new MyClass();
  cacheRequest = new fireauth.CacheRequest();
}


function tearDown() {
  cacheRequest = null;
}


/**
 * Test cache request when the cached request resolves successfully.
 * @return {!goog.Promise} The result of the test.
 */
function cacheRequestWithoutErrors() {
  clock = new goog.testing.MockClock(true);
  cacheRequest.cache(instance.func, instance, [1, 2], 60 * 1000);
  return cacheRequest.run().then(function(result) {
    assertEquals(result, 1);
    // This response should be returned from cache.
    return cacheRequest.run();
  }).then(function(result) {
    assertEquals(result, 1);
    clock.tick(60 * 1000);
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).then(function(result) {
    assertEquals(result, 2);
    clock.tick(30 * 1000);
    // This response should be returned from cache.
    return cacheRequest.run();
  }).then(function(result) {
    assertEquals(result, 2);
    clock.tick(30 * 1000);
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).then(function(result) {
    assertEquals(result, 3);
    cacheRequest.purge();
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).then(function(result) {
    assertEquals(result, 4);
    goog.dispose(clock);
  });
}


/**
 * Test cache request when the cached request rejects with an error and errors
 * are not to be cached.
 * @return {!goog.Promise} The result of the test.
 */
function cacheRequestWithErrorsNotCached() {
  clock = new goog.testing.MockClock(true);
  cacheRequest.cache(instance.func2, instance, [1, 2], 60 * 1000);
  return cacheRequest.run().thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 1);
    // This response should not be returned from cache.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 2);
    cacheRequest.purge();
    // This response should not be returned from cache.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 3);
    goog.dispose(clock);
  });
}


/**
 * Test cache request when the cached request rejects with an error and errors
 * are set to be cached.
 * @return {!goog.Promise} The result of the test.
 */
function cacheRequestWithErrorsCached() {
  clock = new goog.testing.MockClock(true);
  cacheRequest.cache(instance.func2, instance, [1, 2], 60 * 1000, true);
  return cacheRequest.run().thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 1);
    // This response should be returned from cache.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 1);
    clock.tick(60 * 1000);
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 2);
    clock.tick(30 * 1000);
    // This response should be returned from cache.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 2);
    clock.tick(30 * 1000);
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 3);
    cacheRequest.purge();
    // This should bust the cache and send a request.
    return cacheRequest.run();
  }).thenCatch(function(error) {
    assertEquals(parseInt(error.message, 10), 4);
    goog.dispose(clock);
  });
}


/**
 * Install the test to run and runs it.
 * @param {string} id The test identifier.
 * @param {function():!goog.Promise} func The test function to run.
 * @return {!goog.Promise} The result of the test.
 */
function installAndRunTest(id, func) {
  var testCase = new goog.testing.TestCase();
  testCase.addNewTest(id, func);
  return testCase.runTestsReturningPromise().then(function(result) {
    assertTrue(result.complete);
    assertEquals(1, result.totalCount);
    assertEquals(1, result.runCount);
    assertEquals(1, result.successCount);
    assertEquals(0, result.errors.length);
  });
}


function testNoAvailableConfiguration() {
  try {
    cacheRequest.run();
    fail('Missing cache configuration should throw an error!');
  } catch(e) {
    assertEquals('No available configuration cached!', e.message);
  }
}


function testCacheRequestWithoutErrors() {
  return installAndRunTest(
      'cacheRequestWithoutErrors', cacheRequestWithoutErrors);
}


function testCacheRequestWithErrorsNotCached() {
  return installAndRunTest(
      'cacheRequestWithErrorsNotCached', cacheRequestWithErrorsNotCached);
}


function testCacheRequestWithErrorsCached() {
  return installAndRunTest(
      'cacheRequestWithErrorsCached', cacheRequestWithErrorsCached);
}
