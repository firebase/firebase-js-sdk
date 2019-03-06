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
 * @fileoverview Tests for proactiverefresh.js.
 */

goog.provide('fireauth.ProactiveRefreshTest');

goog.require('fireauth.AuthError');
goog.require('fireauth.ProactiveRefresh');
goog.require('fireauth.authenum.Error');
goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.testing.MockClock');
goog.require('goog.testing.PropertyReplacer');
goog.require('goog.testing.jsunit');
goog.require('goog.testing.recordFunction');

goog.setTestOnly('fireauth.ProactiveRefreshTest');


var clock;
var stubs = new goog.testing.PropertyReplacer();
var forceRetryError = false;
var operation = null;
var unrecoverableOperation = null;
var retryPolicy = null;
var getWaitDuration = null;
var proactiveRefresh = null;
var lowerBound = null;
var upperBound = null;
var runsInBackground = true;
var lastTimestamp = 0;
var makeAppVisible = null;
var cycle = 1000;


function setUp() {
  // Whether to force a retry error to be thrown in the operation to be run.
  forceRetryError = false;
  // The time stamp corresponding to the last operation run.
  lastTimestamp = 0;
  // Initialize mock clock.
  clock = new goog.testing.MockClock(true);
  // Stub on app visible utility.
  makeAppVisible = null;
  stubs.replace(
      fireauth.util,
      'onAppVisible',
      function() {
        return new goog.Promise(function(resolve, reject) {
          // On every call, save onAppVisible resolution function.
          makeAppVisible = resolve;
        });
      });
  // Operation to practively refresh.
  operation = goog.testing.recordFunction(function() {
    // Record last run time.
    lastTimestamp = goog.now();
    if (!forceRetryError) {
      // Do not force error retry. Resolve successfully.
      return goog.Promise.resolve();
    } else {
      // If retrial error should be forced, throw a network error.
      return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.NETWORK_REQUEST_FAILED));
    }
  });
  // Operation which throws an unrecoverable error.
  unrecoverableOperation = goog.testing.recordFunction(function() {
    // Record last run time.
    lastTimestamp = goog.now();
    // Throw unrecoverable error.
    return goog.Promise.reject(
        new fireauth.AuthError(fireauth.authenum.Error.INTERNAL_ERROR));
  });
  // Retry policy. Retry only on network errors.
  retryPolicy = function(error) {
    if (error && error.code == 'auth/network-request-failed') {
      return true;
    }
    return false;
  };
  // Return a cycle for next time to rerun after a successful run.
  getWaitDuration = function() {
    return cycle;
  };
  // Upper bound is 90% of a cycle.
  upperBound = 0.9 * cycle;
  // Lower bound is 10 % of a cycle.
  lowerBound = 0.1 * cycle;
  // Whether to run refresh in the background.
  runsInBackground = true;
}


/** Simulates an app becoming visible. */
function simulateAppIsVisible() {
  // Simulate the app becoming visible.
  makeAppVisible();
  // This is needed for the internal promises to resolve.
  clock.tick(0.1);
}


/**
 * Rounds the actual value and then asserts it is equal to the expected rounded
 * value.
 * @param {number} expected The expected value.
 * @param {number} actual The actual value.
 */
function assertRoundedEqual(expected, actual) {
  // Round to the nearest and then compare.
  assertEquals(Math.floor(expected), Math.floor(actual));
}


function tearDown() {
  // Reset stubs, mocks and all global test variables.
  stubs.reset();
  forceRetryError = false;
  operation = null;
  retryPolicy = null;
  getWaitDuration = null;
  upperBound = null;
  lowerBound = null;
  runsInBackground = true;
  makeAppVisible = null;
  unrecoverableOperation = null;
  if (proactiveRefresh) {
    proactiveRefresh.stop();
    proactiveRefresh = null;
  }
  lastTimestamp = 0;
  goog.dispose(clock);
}


function testProactiveRefresh_invalidBounds() {
  var error = assertThrows(function() {
    new fireauth.ProactiveRefresh(
        operation, retryPolicy, getWaitDuration, upperBound, lowerBound,
        runsInBackground);
  });
  assertEquals(
      'Proactive refresh lower bound greater than upper bound!', error.message);
}


function testProactiveRefresh_runsInBackground_success() {
  // Test proactive refresh with multiple successful runs when the refresh can
  // run in the background.
  // Can run in background.
  runsInBackground = true;
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, upperBound,
      runsInBackground);
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
  // Start proactive refresh.
  proactiveRefresh.start();
  // Assert proactive refresh is running.
  assertTrue(proactiveRefresh.isRunning());
  // Simulate one cycle passed.
  clock.tick(cycle);
  // Confirm operation run after one cycle.
  assertEquals(1, operation.getCallCount());
  assertEquals(cycle, lastTimestamp);
  // Confirm operation run after 2 cycle.
  clock.tick(cycle);
  assertEquals(2, operation.getCallCount());
  assertEquals(2 * cycle, lastTimestamp);
  // Confirm operation run after 3 cycles.
  clock.tick(cycle);
  assertEquals(3, operation.getCallCount());
  assertEquals(3 * cycle, lastTimestamp);
  // Stop proactive refresh.
  proactiveRefresh.stop();
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
  // Confirm proactive refresh stopped even after another cycle.
  clock.tick(cycle);
  assertEquals(3, operation.getCallCount());

  // Restart should reset and start again.
  proactiveRefresh.start();
  // Assert proactive refresh is running.
  assertTrue(proactiveRefresh.isRunning());
  // Simulate another cycle.
  clock.tick(cycle);
  // Operation should run again.
  assertEquals(4, operation.getCallCount());
  assertEquals(5 * cycle, lastTimestamp);
  // Stop proactive refresh
  proactiveRefresh.stop();
  // Confirm proactive refresh stopped.
  clock.tick(cycle);
  assertEquals(4, operation.getCallCount());
}


function testProactiveRefresh_cannotRunInBackground_success() {
  // Test proactive refresh with multiple successful runs when the refresh
  // cannot run in the background.
  // Run while forcing refresh only when app is visible.
  runsInBackground = false;
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, upperBound,
      runsInBackground);
  // Start proactive refresh.
  proactiveRefresh.start();
  // Simulate 3.5 cycles passed.
  clock.tick(3.5 * cycle);
  // As app is not visible, operation should not run.
  assertEquals(0, operation.getCallCount());
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Operation should run immediately at that point in time.
  assertEquals(1, operation.getCallCount());
  assertRoundedEqual(3.5 * cycle, lastTimestamp);
  // Simulate 1.5 cycles passed and then app is visible again.
  clock.tick(1.5 * cycle);
  simulateAppIsVisible();
  // Operation should run immediately.
  assertEquals(2, operation.getCallCount());
  assertRoundedEqual(5 * cycle, lastTimestamp);
  // Simulate app immediately visible on next run after the typical success
  // interval.
  clock.tick(1 * cycle);
  simulateAppIsVisible();
  // Operation should run.
  assertEquals(3, operation.getCallCount());
  assertRoundedEqual(6 * cycle, lastTimestamp);
  // Stop refresh.
  proactiveRefresh.stop();
  // Simulate another cycle passed.
  clock.tick(1 * cycle);
  // Even after app is visible, operation should not run again.
  simulateAppIsVisible();
  // No additional run.
  assertEquals(3, operation.getCallCount());
}


function testProactiveRefresh_unrecoverableError() {
  // Test proactive refresh when an error that does not meet retry policy is
  // thrown.
  // Can run in background.
  runsInBackground = true;
  // Test with an operation that throws an unrecoverable error.
  proactiveRefresh = new fireauth.ProactiveRefresh(
      unrecoverableOperation, retryPolicy, getWaitDuration, lowerBound,
      upperBound, runsInBackground);
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
  // Start proactive refresh.
  proactiveRefresh.start();
  // After 3 cycles, only one run should have been recorded.
  clock.tick(3 * cycle);
  // Should run once, fail and never run again.
  assertEquals(1, unrecoverableOperation.getCallCount());
  // Operation should only run after first cycle.
  assertEquals(cycle, lastTimestamp);
  // Assert proactive refresh is running.
  assertTrue(proactiveRefresh.isRunning());
  // Stop proactive refresh.
  proactiveRefresh.stop();
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
}


function testProactiveRefresh_runsInBackground_retryPolicy() {
  // Test exponential backoff after a network error when the refresh can run in
  // the background.
  // Can run in background.
  runsInBackground = true;
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, upperBound,
      runsInBackground);
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
  // Start proactive refresh.
  proactiveRefresh.start();
  clock.tick(1 * cycle);
  // Should run once after a cycle.
  assertEquals(1, operation.getCallCount());
  assertEquals(cycle, lastTimestamp);
  // Simulate error that meets retry policy.
  forceRetryError = true;
  // Wait for one cycle.
  clock.tick(1 * cycle);
  // Operation should run after one cycle.
  assertEquals(2, operation.getCallCount());
  assertEquals(2 * cycle, lastTimestamp);
  // As error that meets retry policy detected, this should rerun at lower bound
  // interval.
  clock.tick(0.1 * cycle);
  // Rerun after 0.1 cycles.
  assertEquals(3, operation.getCallCount());
  assertEquals(2.1 * cycle, lastTimestamp);
  // Should run again in 0.2 cycles.
  clock.tick(0.2 * cycle);
  assertEquals(4, operation.getCallCount());
  assertEquals(2.3 * cycle, lastTimestamp);
  // Should run again in 0.4 cycles.
  clock.tick(0.4 * cycle);
  assertEquals(5, operation.getCallCount());
  assertEquals(2.7 * cycle, lastTimestamp);
  // Should run again in 0.8 cycles.
  clock.tick(0.8 * cycle);
  assertEquals(6, operation.getCallCount());
  assertEquals(3.5 * cycle, lastTimestamp);
  // Should reach upper bound of 0.9.
  clock.tick(0.9 * cycle);
  // Reruns at upper bound interval.
  assertEquals(7, operation.getCallCount());
  assertEquals(4.4 * cycle, lastTimestamp);
  // Should not exceed upper bound.
  clock.tick(0.9 * cycle);
  // Reruns again at upper bound interval.
  assertEquals(8, operation.getCallCount());
  assertEquals(5.3 * cycle, lastTimestamp);
  // Assert proactive refresh is running.
  assertTrue(proactiveRefresh.isRunning());
  // Simulate success on next run.
  forceRetryError = false;
  // Next rerun at upper bound interval should succeed.
  clock.tick(0.9 * cycle);
  assertEquals(9, operation.getCallCount());
  assertEquals(6.2 * cycle, lastTimestamp);
  // Next one should run at normal cycles.
  clock.tick(cycle);
  assertEquals(10, operation.getCallCount());
  assertEquals(7.2 * cycle, lastTimestamp);
  // Assert proactive refresh is running.
  assertTrue(proactiveRefresh.isRunning());
  // Stop proactive refresh.
  proactiveRefresh.stop();
  // Assert proactive refresh is not running.
  assertFalse(proactiveRefresh.isRunning());
}


function testProactiveRefresh_equalBounds() {
  // Check when upper and lower bounds are equal that the same wait is applied
  // each time an error occurs.
  runsInBackground = true;
  // Use same upper/lower bound.
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, lowerBound,
      runsInBackground);
  // Simulate error that meets retry policy.
  forceRetryError = true;
  // Start proactive refresh.
  proactiveRefresh.start();
  // Operation should run after one cycle with an error occurring.
  clock.tick(1 * cycle);
  // Should run once.
  assertEquals(1, operation.getCallCount());
  assertEquals(cycle, lastTimestamp);
  // Simulate one lower bound duration.
  clock.tick(lowerBound);
  // Should run again.
  assertEquals(2, operation.getCallCount());
  assertEquals(cycle + lowerBound, lastTimestamp);
  // Simulate another lower bound duration.
  clock.tick(lowerBound);
  // Should run again.
  assertEquals(3, operation.getCallCount());
  assertEquals(cycle + 2 * lowerBound, lastTimestamp);
  // Simulate another lower bound duration.
  clock.tick(lowerBound);
  // Should run again.
  assertEquals(4, operation.getCallCount());
  assertEquals(cycle + 3 * lowerBound, lastTimestamp);
  // Stop proactive refresh.
  proactiveRefresh.stop();
}


function testProactiveRefresh_cannotRunInBackground_retryPolicy() {
  // Test exponential backoff after a network error when the refresh cannot run
  // in the background.
  // Can run in background.
  runsInBackground = false;
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, upperBound,
      runsInBackground);
  // Simulate error that meets retry policy.
  forceRetryError = true;
  // Start proactive refresh.
  proactiveRefresh.start();
  // Operation should run after one cycle if app is visible.
  clock.tick(1 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Should run once.
  assertEquals(1, operation.getCallCount());
  assertEquals(cycle, lastTimestamp);
  // Simulate 3 cycles before app is visible again.
  clock.tick(3 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Even though an error occurred, it won't run until app is visible again.
  assertEquals(2, operation.getCallCount());
  assertRoundedEqual(4 * cycle, lastTimestamp);
  // Simulate 3 cycles before app is visible again.
  clock.tick(3 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Even though an error occurred, it won't run until app is visible again.
  assertEquals(3, operation.getCallCount());
  assertRoundedEqual(7 * cycle, lastTimestamp);
  // Simulate 0.4 cycles before app is visible again. This is the expected time
  // to rerun if the app is visible and 2 errors already occurred.
  clock.tick(0.4 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Next run occurs at expected time as app is visible.
  assertEquals(4, operation.getCallCount());
  assertRoundedEqual(7.4 * cycle, lastTimestamp);
  // Simulate 0.8 cycles and app is visible. The is the expected next run after
  // 3 errors.
  clock.tick(0.8 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Next run occurs at expected time as app is visible.
  assertEquals(5, operation.getCallCount());
  assertRoundedEqual(8.2 * cycle, lastTimestamp);
  // Simulate next operation succeeds after expected retry interval.
  forceRetryError = false;
  clock.tick(0.9 * cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  // Should have succeeded after 0.9 cycles.
  assertEquals(6, operation.getCallCount());
  assertRoundedEqual(9.1 * cycle, lastTimestamp);
  // Next run should occur as scheduled after a successful refresh.
  clock.tick(cycle);
  // Simulate the app becoming visible.
  simulateAppIsVisible();
  assertEquals(7, operation.getCallCount());
  assertRoundedEqual(10.1 * cycle, lastTimestamp);
  // Stop proactive refresh.
  proactiveRefresh.stop();
}


function testProactiveRefresh_runsInBackground_retryPolicy_stopAndRestart() {
  // Test exponential backoff after a network error when the refresh can run in
  // the background. Test that restart resets the previous error.
  // Can run in background.
  runsInBackground = true;
  proactiveRefresh = new fireauth.ProactiveRefresh(
      operation, retryPolicy, getWaitDuration, lowerBound, upperBound,
      runsInBackground);
  // Simulate error that meets retry policy.
  forceRetryError = true;
  // Start proactive refresh.
  proactiveRefresh.start();
  // After once cycle, operation should run and error detected.
  clock.tick(cycle);
  assertEquals(1, operation.getCallCount());
  assertEquals(cycle, lastTimestamp);
  // Should rerun at lower bound.
  clock.tick(0.1 * cycle);
  assertEquals(2, operation.getCallCount());
  assertEquals(1.1 * cycle, lastTimestamp);
  // Stop proactive refresh.
  proactiveRefresh.stop();
  // Restart proactive refresh.
  proactiveRefresh.start();
  // Confirm next run is at regular interval regardless of previous error.
  clock.tick(cycle);
  assertEquals(3, operation.getCallCount());
  assertEquals(2.1 * cycle, lastTimestamp);
  // Stop proactive refresh.
  proactiveRefresh.stop();
}
