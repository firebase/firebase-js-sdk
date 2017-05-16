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
goog.provide('fb.api.TEST_ACCESS');

goog.require('fb.core.PersistentConnection');
goog.require('fb.core.RepoManager');


fb.api.TEST_ACCESS.DataConnection = fb.core.PersistentConnection;
goog.exportProperty(fb.api.TEST_ACCESS, 'DataConnection', fb.api.TEST_ACCESS.DataConnection);

/**
 * @param {!string} pathString
 * @param {function(*)} onComplete
 */
fb.core.PersistentConnection.prototype.simpleListen = function(pathString, onComplete) {
  this.sendRequest('q', {'p': pathString}, onComplete);
};
goog.exportProperty(fb.api.TEST_ACCESS.DataConnection.prototype, 'simpleListen',
  fb.api.TEST_ACCESS.DataConnection.prototype.simpleListen
);

/**
 * @param {*} data
 * @param {function(*)} onEcho
 */
fb.core.PersistentConnection.prototype.echo = function(data, onEcho) {
  this.sendRequest('echo', {'d': data}, onEcho);
};
goog.exportProperty(fb.api.TEST_ACCESS.DataConnection.prototype, 'echo',
  fb.api.TEST_ACCESS.DataConnection.prototype.echo);

goog.exportProperty(fb.core.PersistentConnection.prototype, 'interrupt',
  fb.core.PersistentConnection.prototype.interrupt
);


// RealTimeConnection properties that we use in tests.
fb.api.TEST_ACCESS.RealTimeConnection = fb.realtime.Connection;
goog.exportProperty(fb.api.TEST_ACCESS, 'RealTimeConnection', fb.api.TEST_ACCESS.RealTimeConnection);
goog.exportProperty(fb.realtime.Connection.prototype, 'sendRequest', fb.realtime.Connection.prototype.sendRequest);
goog.exportProperty(fb.realtime.Connection.prototype, 'close', fb.realtime.Connection.prototype.close);



/**
 * @param {function(): string} newHash
 * @return {function()}
 */
fb.api.TEST_ACCESS.hijackHash = function(newHash) {
  var oldPut = fb.core.PersistentConnection.prototype.put;
  fb.core.PersistentConnection.prototype.put = function(pathString, data, opt_onComplete, opt_hash) {
    if (goog.isDef(opt_hash)) {
      opt_hash = newHash();
    }
    oldPut.call(this, pathString, data, opt_onComplete, opt_hash);
  };
  return function() {
    fb.core.PersistentConnection.prototype.put = oldPut;
  }
};
goog.exportProperty(fb.api.TEST_ACCESS, 'hijackHash', fb.api.TEST_ACCESS.hijackHash);

/**
 * @type {function(new:fb.core.RepoInfo, !string, boolean, !string, boolean): undefined}
 */
fb.api.TEST_ACCESS.ConnectionTarget = fb.core.RepoInfo;
goog.exportProperty(fb.api.TEST_ACCESS, 'ConnectionTarget', fb.api.TEST_ACCESS.ConnectionTarget);

/**
 * @param {!fb.api.Query} query
 * @return {!string}
 */
fb.api.TEST_ACCESS.queryIdentifier = function(query) {
  return query.queryIdentifier();
};
goog.exportProperty(fb.api.TEST_ACCESS, 'queryIdentifier', fb.api.TEST_ACCESS.queryIdentifier);

/**
 * @param {!fb.api.Query} firebaseRef
 * @return {!Object}
 */
fb.api.TEST_ACCESS.listens = function(firebaseRef) {
  return firebaseRef.repo.persistentConnection_.listens_;
};
goog.exportProperty(fb.api.TEST_ACCESS, 'listens', fb.api.TEST_ACCESS.listens);


/**
 * Forces the RepoManager to create Repos that use ReadonlyRestClient instead of PersistentConnection.
 *
 * @param {boolean} forceRestClient
 */
fb.api.TEST_ACCESS.forceRestClient = function(forceRestClient) {
  fb.core.RepoManager.getInstance().forceRestClient(forceRestClient);
};
goog.exportProperty(fb.api.TEST_ACCESS, 'forceRestClient', fb.api.TEST_ACCESS.forceRestClient);

goog.exportProperty(fb.api.TEST_ACCESS, 'Context', fb.core.RepoManager);
