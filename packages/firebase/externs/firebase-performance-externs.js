/**
 * @license Copyright 2019 Google Inc.
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
 * @fileoverview Firebase Performance SDK externs
 */

/**
 * @param {!firebase.app.App=} app The app to create a fireperf service for.  If
 *    not passed, uses the default app
 *
 * @return {!firebase.performance.Performance}
 */
firebase.performance = function(app) {};


/** @interface */
firebase.performance.Performance = function() {};

/** @typedef {boolean} Controls logging for automatic traces and HTTP/S requests */
firebase.performance.Performance.prototype.instrumentationEnabled;

/** @typedef {boolean} Controls logging for custom traces */
firebase.performance.Performance.prototype.dataCollectionEnabled;

/**
 * @param {string} traceName
 *
 * @return {!firebase.performance.Trace}
 */
firebase.performance.Performance.prototype.trace = function(traceName) {};

/** @interface */
firebase.performance.Trace = function() {};
