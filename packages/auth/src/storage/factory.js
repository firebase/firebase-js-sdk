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

goog.provide('fireauth.storage.Factory');
goog.provide('fireauth.storage.Factory.EnvConfig');

goog.require('fireauth.storage.AsyncStorage');
goog.require('fireauth.storage.HybridIndexedDB');
goog.require('fireauth.storage.InMemoryStorage');
goog.require('fireauth.storage.LocalStorage');
goog.require('fireauth.storage.NullStorage');
goog.require('fireauth.storage.SessionStorage');
goog.require('fireauth.util');


/**
 * Factory manages the storage implementations and determines the correct one
 * for the current environment.
 * @param {!fireauth.storage.Factory.EnvConfigType} env The storage
 *     configuration for the current environment.
 * @constructor
 */
fireauth.storage.Factory = function(env) {
  /** @const @private {!fireauth.storage.Factory.EnvConfigType} */
  this.env_ = env;
};


/**
 * Construct the singleton instance of the Factory, automatically detecting
 * the current environment.
 * @return {!fireauth.storage.Factory}
 */
fireauth.storage.Factory.getInstance = function() {
  if (!fireauth.storage.Factory.instance_) {
    fireauth.storage.Factory.instance_ =
        new fireauth.storage.Factory(fireauth.storage.Factory.getEnvConfig());
  }
  return fireauth.storage.Factory.instance_;
};


/**
 * @typedef {{
 *   persistent: function(new:fireauth.storage.Storage),
 *   temporary: function(new:fireauth.storage.Storage)
 * }}
 */
fireauth.storage.Factory.EnvConfigType;


/**
 * Configurations of storage for different environments.
 * @enum {!fireauth.storage.Factory.EnvConfigType}
 */
fireauth.storage.Factory.EnvConfig = {
  BROWSER: {
    persistent: fireauth.storage.LocalStorage,
    temporary: fireauth.storage.SessionStorage
  },
  NODE: {
    persistent: fireauth.storage.LocalStorage,
    temporary: fireauth.storage.SessionStorage
  },
  REACT_NATIVE: {
    persistent: fireauth.storage.AsyncStorage,
    temporary: fireauth.storage.NullStorage
  },
  WORKER: {
    persistent: fireauth.storage.LocalStorage,
    temporary: fireauth.storage.NullStorage
  }
};


/**
 * Detects the current environment and returns the appropriate environment
 * configuration.
 * @return {!fireauth.storage.Factory.EnvConfigType}
 */
fireauth.storage.Factory.getEnvConfig = function() {
  var envMap = {};
  envMap[fireauth.util.Env.BROWSER] =
      fireauth.storage.Factory.EnvConfig.BROWSER;
  envMap[fireauth.util.Env.NODE] =
      fireauth.storage.Factory.EnvConfig.NODE;
  envMap[fireauth.util.Env.REACT_NATIVE] =
      fireauth.storage.Factory.EnvConfig.REACT_NATIVE;
  envMap[fireauth.util.Env.WORKER] =
      fireauth.storage.Factory.EnvConfig.WORKER;    
  return envMap[fireauth.util.getEnvironment()];
};


/**
 * @return {!fireauth.storage.Storage} The persistent storage instance.
 */
fireauth.storage.Factory.prototype.makePersistentStorage = function() {
  if (fireauth.util.persistsStorageWithIndexedDB()) {
    // If persistent storage is implemented using indexedDB, use indexedDB.
    // Use HybridIndexedDB instead of indexedDB directly since this will
    // fallback to a fallback storage when indexedDB is not supported (private
    // browsing mode, etc).
    return new fireauth.storage.HybridIndexedDB(
        fireauth.util.isWorker() ?
        new fireauth.storage.InMemoryStorage() : new this.env_.persistent());
  }
  return new this.env_.persistent();
};


/**
 * @return {!fireauth.storage.Storage} The temporary storage instance.
 */
fireauth.storage.Factory.prototype.makeTemporaryStorage = function() {
  return new this.env_.temporary();
};


/**
 * @return {!fireauth.storage.Storage} An in memory storage instance.
 */
fireauth.storage.Factory.prototype.makeInMemoryStorage = function() {
  return new fireauth.storage.InMemoryStorage();
};
