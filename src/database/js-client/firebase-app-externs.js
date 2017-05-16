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
/**
 * @fileoverview Firebase namespace and Firebase App API.
 * Version: 3.5.2
 *
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @externs
 */

/**
 * <code>firebase</code> is a global namespace from which all the Firebase
 * services are accessed.
 *
 * @namespace
 */
var firebase = {};

/**
 * Create (and intialize) a FirebaseApp.
 *
 * @example
 * // Retrieve your own options values by adding a web app on
 * // http://console.firebase.google.com
 * var options = {
 *   apiKey: "AIza....",                             // Auth / General Use
 *   authDomain: "YOUR_APP.firebaseapp.com",         // Auth with popup/redirect
 *   databaseURL: "https://YOUR_APP.firebaseio.com", // Realtime Database
 *   storageBucket: "YOUR_APP.appspot.com",          // Storage
 *   messagingSenderId: "123456789"                  // Cloud Messaging
 * };
 * // Initialize default application.
 * firebase.initializeApp(options);
 *
 * @param {!Object} options Options to configure the services use in the App.
 * @param {string=} name The optional name of the app to initialize ('[DEFAULT]'
 *     if none)
 * @return {!firebase.app.App}
 */
firebase.initializeApp = function(options, name) {};

/**
 * Retrieve an instance of a FirebaseApp.
 *
 * With no arguments, this returns the default App.  With a single
 * string argument, it returns the named App.
 *
 * This function throws an exception if the app you are trying to access
 * does not exist.
 *
 * Usage: firebase.app()
 *
 * @namespace
 * @param {string} name The optional name of the app to return ('[DEFAULT]' if
 *     none)
 * @return {!firebase.app.App}
 */
firebase.app = function(name) {};

/**
 * A (read-only) array of all the initialized Apps.
 * @type {!Array<firebase.app.App>}
 */
firebase.apps;

/**
 * The current SDK version ('3.5.2').
 * @type {string}
 */
firebase.SDK_VERSION;

/**
 * A Firebase App holds the initialization information for a collection of
 * services.
 *
 * DO NOT call this constuctor directly (use
 * <code>firebase.initializeApp()</code> to create an App).
 *
 * @interface
 */
firebase.app.App = function() {};

/**
 * The (read-only) name (identifier) for this App. '[DEFAULT]' is the name of
 * the default App.
 * @type {string}
 */
firebase.app.App.prototype.name;

/**
 * The (read-only) configuration options (the original parameters given
 * in <code>firebase.initializeApp()</code>).
 * @type {!Object}
 */
firebase.app.App.prototype.options;

/**
 * Make the given App unusable and free the resources of all associated
 * services.
 *
 * @return {!firebase.Promise<void>}
 */
firebase.app.App.prototype.delete = function() {};

/**
 * A Thenable is the standard interface returned by a Promise.
 *
 * @template T
 * @interface
 */
firebase.Thenable = function() {};

/**
 * Assign callback functions called when the Thenable value either
 * resolves, or is rejected.
 *
 * @param {(function(T): *)=} onResolve Called when the Thenable resolves.
 * @param {(function(!Error): *)=} onReject Called when the Thenable is rejected
 *   (with an error).
 * @return {!firebase.Thenable<*>}
 */
firebase.Thenable.prototype.then = function(onResolve, onReject) {};

/**
 * Assign a callback when the Thenable rejects.
 *
 * @param {(function(!Error): *)=} onReject Called when the Thenable is rejected
 *   (with an error).
 * @return {!firebase.Thenable<*>}
 */
firebase.Thenable.prototype.catch = function(onReject) {};

/**
 * A Promise represents an eventual (asynchronous) value. A Promise should
 * (eventually) either resolve or reject. When it does, it will call all the
 * callback functions that have been assigned via the <code>.then()</code> or
 * <code>.catch()</code> methods.
 *
 * <code>firebase.Promise</code> is the same as the native Promise
 * implementation when available in the current environment, otherwise it is a
 * compatible implementation of the Promise/A+ spec.
 *
 * @template T
 * @constructor
 * @implements {firebase.Thenable}
 * @param {function((function(T): void)=,
 *                  (function(!Error): void)=)} resolver
 */
firebase.Promise = function(resolver) {};

/**
 * Assign callback functions called when the Promise either resolves, or is
 * rejected.
 *
 * @param {(function(T): *)=} onResolve Called when the Promise resolves.
 * @param {(function(!Error): *)=} onReject Called when the Promise is rejected
 *   (with an error).
 * @return {!firebase.Promise<*>}
 */
firebase.Promise.prototype.then = function(onResolve, onReject) {};

/**
 * Assign a callback when the Promise rejects.
 *
 * @param {(function(!Error): *)=} onReject Called when the Promise is rejected
 *   (with an error).
 */
firebase.Promise.prototype.catch = function(onReject) {};

/**
 * Return a resolved Promise.
 *
 * @template T
 * @param {T=} value The value to be returned by the Promise.
 * @return {!firebase.Promise<T>}
 */
firebase.Promise.resolve = function(value) {};

/**
 * Return (an immediately) rejected Promise.
 *
 * @param {!Error} error The reason for the Promise being rejected.
 * @return {!firebase.Promise<*>}
 */
firebase.Promise.reject = function(error) {};

/**
 * Convert an array of Promises, to a single array of values.
 * <code>Promise.all()</code> resolves only after all the Promises in the array
 * have resolved.
 *
 * <code>Promise.all()</code> rejects when any of the promises in the Array have
 * rejected.
 *
 * @param {!Array<!firebase.Promise<*>>} values
 * @return {!firebase.Promise<!Array<*>>}
 */
firebase.Promise.all = function(values) {};
