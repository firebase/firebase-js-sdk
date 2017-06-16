import { RepoInfo } from "../core/RepoInfo";
import { PersistentConnection } from "../core/PersistentConnection";
import { RepoManager } from "../core/RepoManager";
import { Connection } from "../realtime/Connection";

export const DataConnection = PersistentConnection;

/**
 * @param {!string} pathString
 * @param {function(*)} onComplete
 */
(PersistentConnection.prototype as any).simpleListen = function(pathString, onComplete) {
  this.sendRequest('q', {'p': pathString}, onComplete);
};

/**
 * @param {*} data
 * @param {function(*)} onEcho
 */
(PersistentConnection.prototype as any).echo = function(data, onEcho) {
  this.sendRequest('echo', {'d': data}, onEcho);
};

// RealTimeConnection properties that we use in tests.
export const RealTimeConnection = Connection;

/**
 * @param {function(): string} newHash
 * @return {function()}
 */
export const hijackHash = function(newHash) {
  var oldPut = PersistentConnection.prototype.put;
  PersistentConnection.prototype.put = function(pathString, data, opt_onComplete, opt_hash) {
    if (opt_hash !== undefined) {
      opt_hash = newHash();
    }
    oldPut.call(this, pathString, data, opt_onComplete, opt_hash);
  };
  return function() {
    PersistentConnection.prototype.put = oldPut;
  }
};

/**
 * @type {function(new:fb.core.RepoInfo, !string, boolean, !string, boolean): undefined}
 */
export const ConnectionTarget = RepoInfo;

/**
 * @param {!fb.api.Query} query
 * @return {!string}
 */
export const queryIdentifier = function(query) {
  return query.queryIdentifier();
};

/**
 * @param {!fb.api.Query} firebaseRef
 * @return {!Object}
 */
export const listens = function(firebaseRef) {
  return firebaseRef.repo.persistentConnection_.listens_;
};

/**
 * Forces the RepoManager to create Repos that use ReadonlyRestClient instead of PersistentConnection.
 *
 * @param {boolean} forceRestClient
 */
export const forceRestClient = function(forceRestClient) {
  RepoManager.getInstance().forceRestClient(forceRestClient);
};
