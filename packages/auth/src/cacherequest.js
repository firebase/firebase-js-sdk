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
 * @fileoverview Utility for caching requests that return promises, typically
 * used for requests that are sent to the server.
 */

goog.provide('fireauth.CacheRequest');

goog.require('goog.Promise');


/**
 * This utility caches a function call that returns a promise along with its
 * arguments. It gives the user the option to specify the cache duration and
 * whether to cach errors as well as the ability to purge cache with its
 * contents if needed.
 * @constructor @struct
 */
fireauth.CacheRequest = function() {
  /** @private {?function(*):!goog.Promise} The function to cache. */
  this.func_ = null;
  /** @private {*} The context (this) of the function to cache. */
  this.self_ = null;
  /** @private {Array} The array of arguments to run the function with. */
  this.arguments_ = [];
  /** @private {?goog.Promise} The cached returned promise result. */
  this.cachedResult_ = null;
  /** @private {number} The expiration timestamp of the cached result. */
  this.expirationTime_ = goog.now();
  /** @private {number} The time to live from the caching point in time. */
  this.ttl_ = 0;
  /** @private {boolean} Whether to cache errors too. */
  this.cacheErrors_ = false;
};


/**
 * @param {function(*):!goog.Promise} func The function to cache.
 * @param {*} self The context (this) of the function to cache.
 * @param {Array} args The array of arguments to run the function with.
 * @param {number} ttl The time to live for any cached results in milliseconds.
 * @param {boolean=} opt_cacheErrors Whether to cache errors too.
 */
fireauth.CacheRequest.prototype.cache =
    function(func, self, args, ttl, opt_cacheErrors) {
  this.func_ = func;
  this.self_ = self;
  this.arguments_ = args;
  this.expirationTime_ = goog.now();
  this.ttl_ = ttl;
  this.cacheErrors_ = !!opt_cacheErrors;

};


/**
 * @return {!goog.Promise} The promise that resolves when the function is run
 *     or the previously cached promise.
 */
fireauth.CacheRequest.prototype.run = function() {
  var self = this;
  if (!this.func_) {
    throw new Error('No available configuration cached!');
  }
  // If the result is not cached or the cache result is outdated.
  if (!this.cachedResult_ || goog.now() >= this.expirationTime_) {
    // Set expiration of current request.
    this.expirationTime_ = goog.now() + this.ttl_;
    // Get new result and cache it.
    this.cachedResult_ =
        this.func_.apply(this.self_, this.arguments_).then(function(result) {
          // When successful resolution, just return the result which is to be
          // cached.
          return result;
        }).thenCatch(function(error) {
          // When an error is thrown.
          if (!self.cacheErrors_) {
            // Do not cache errors if errors are not to be cached.
            // This will bust the cached result. Otherwise the error is cached.
            self.expirationTime_ = goog.now();
          }
          // Throw the returned error.
          throw error;
        });
  }
  // Return the cached result.
  return this.cachedResult_;
};


/** Purges any cached results. */
fireauth.CacheRequest.prototype.purge = function() {
  // Purge the cached results.
  this.cachedResult_ = null;
  this.expirationTime_ = goog.now();
};
