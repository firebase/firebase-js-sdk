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
 * @fileoverview Utility for proactive refresh with exponential backoff
 * algorithm typically used to define a retry policy for certain async
 * operations.
 */

goog.provide('fireauth.ProactiveRefresh');

goog.require('fireauth.util');
goog.require('goog.Promise');
goog.require('goog.Timer');


/**
 * The helper utility used to proactively refresh a certain operation based on
 * certain constraints with an exponential backoff retrial policy when
 * specific recoverable errors occur. Typically this is used to retry an
 * operation on network errors.
 * @param {!function():!goog.Promise} operation The promise returning operation
 *     to run.
 * @param {!function(*):boolean} retryPolicy A function that takes in an error
 *     and returns whether a retry policy should be implemented based on the
 *     error. If not, the operation will not run again.
 * @param {!function():number} getWaitDuration A function that returns the wait
 *     period before running again.
 * @param {number} lowerBound The lower bound duration to wait when an error
 *     occurs. This is the first interval to wait before rerunning after an
 *     error is detected.
 * @param {number} upperBound The upper bound duration to wait when an error
 *     keeps occurring. This upper bound should not be exceeded.
 * @param {boolean=} opt_runInBackground Whether to run in the background, when
 *     the tab is not visible. If the refresh should only run when the app is
 *     visible, the operation will block until the app is visible and then run.
 * @constructor @struct @final
 */
fireauth.ProactiveRefresh = function(
    operation,
    retryPolicy,
    getWaitDuration,
    lowerBound,
    upperBound,
    opt_runInBackground) {
  /**
   * @const @private {!function():!goog.Promise} The promise returning operation
   *     to run.
   */
  this.operation_ = operation;
  /**
   * @const @private {!function(*):boolean} The function that takes in an error
   *     and returns whether a retry policy should be implemented based on the
   *     error caught.
   */
  this.retryPolicy_ = retryPolicy;
  /**
   * @const @private {!function():number} The function that returns the wait
   *     period after a successful operation before running again.
   */
  this.getWaitDuration_ = getWaitDuration;
  /**
   * @const @private {number} The lower bound duration to wait when an error
   *     first occurs.
   */
  this.lowerBound_ = lowerBound;
  /**
   * @const @private {number} The upper bound duration to wait when an error
   *     keeps occurring. This upper bound should not be exceeded.
   */
  this.upperBound_ = upperBound;
  /**
   * @const @private {boolean} Whether to run in the background, when the tab is
   *     not visible.
   */
  this.runInBackground_ = !!opt_runInBackground;
  /**
   * @private {?goog.Promise} The pending promise for the next operation to run.
   */
  this.pending_ = null;
  /**
   * @private {number} The first wait interval when a new error occurs.
   */
  this.nextErrorWaitInterval_ = this.lowerBound_;
  // Throw an error if the lower bound is greater than upper bound.
  if (this.upperBound_ < this.lowerBound_) {
    throw new Error('Proactive refresh lower bound greater than upper bound!');
  }
};


/** Starts the proactive refresh based on the current configuration. */
fireauth.ProactiveRefresh.prototype.start = function() {
  // Set the next error wait interval to the lower bound. On each consecutive
  // error, this will double in value until it reaches the upper bound.
  this.nextErrorWaitInterval_ = this.lowerBound_;
  // Start proactive refresh with clean slate (successful status).
  this.process_(true);
};


/**
 * Returns the wait duration before the next run depending on the last run
 * status. If the last operation has succeeded, returns the getWaitDuration()
 * response. Otherwise, doubles the last error wait interval starting from
 * lowerBound and up to upperBound.
 * @param {boolean} hasSucceeded Whether last run succeeded.
 * @return {number} The wait time for the next run.
 * @private
 */
fireauth.ProactiveRefresh.prototype.getNextRun_ = function(hasSucceeded) {
  if (hasSucceeded) {
    // If last operation succeeded, reset next error wait interval and return
    // the default wait duration.
    this.nextErrorWaitInterval_ = this.lowerBound_;
    // Return typical wait duration interval after a successful operation.
    return this.getWaitDuration_();
  } else {
    // Get next error wait interval.
    var currentErrorWaitInterval = this.nextErrorWaitInterval_;
    // Double interval for next consecutive error.
    this.nextErrorWaitInterval_ *= 2;
    // Make sure next wait interval does not exceed the maximum upper bound.
    if (this.nextErrorWaitInterval_  > this.upperBound_) {
      this.nextErrorWaitInterval_  = this.upperBound_;
    }
    return currentErrorWaitInterval;
  }
};


/**
 * Processes one refresh call and sets the timer for the next call based on
 * the last recorded result.
 * @param {boolean} hasSucceeded Whether last run succeeded.
 * @private
 */
fireauth.ProactiveRefresh.prototype.process_ = function(hasSucceeded) {
  var self = this;
  // Stop any other pending operation.
  this.stop();
  // Wait for next scheduled run based on whether an error occurred during last
  // run.
  this.pending_ = goog.Timer.promise(this.getNextRun_(hasSucceeded))
      .then(function() {
        // Block for conditions (if app is required to be visible) to be ready.
        return self.waitUntilReady_();
       })
       .then(function() {
         // Run the operation.
         return self.operation_();
       })
      .then(function() {
         // If successful, try again on next cycle with no previous error
         // passed.
         self.process_(true);
       })
      .thenCatch(function(error) {
         // If an error occurs, only rerun when the error meets the retry
         // policy.
         if (self.retryPolicy_(error)) {
           // Should retry with error to trigger exponentional backoff.
           self.process_(false);
         }
         // Any other error is considered unrecoverable. Do not try again.
       });
};


/**
 * Returns a promise which resolves when the current tab is visible.
 * This resolves quickly if refresh is supposed to run in the background too.
 * @return {!goog.Promise} The promise that resolves when the tab is visible or
 *     that requirement is not needed.
 * @private
 */
fireauth.ProactiveRefresh.prototype.waitUntilReady_ = function() {
  // Wait until app is in foreground if required.
  if (this.runInBackground_) {
    // If runs in background, resolve quickly.
    return goog.Promise.resolve();
  } else {
    // Wait for the app to be visible before resolving the promise.
    return fireauth.util.onAppVisible();
  }
};


/** Stops the proactive refresh from running again. */
fireauth.ProactiveRefresh.prototype.stop = function() {
  // If there is a pending promise.
  if (this.pending_) {
    // Cancel the pending promise and nullify it.
    this.pending_.cancel();
    this.pending_ = null;
  }
};


/** @return {boolean} Whether the proactive refresh is running or not. */
fireauth.ProactiveRefresh.prototype.isRunning = function() {
  return !!this.pending_;
};
