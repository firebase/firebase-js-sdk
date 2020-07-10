/**
 * @license
 * Copyright 2017 Google LLC
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

import { RepoInfo } from '../core/RepoInfo';
import { PersistentConnection } from '../core/PersistentConnection';
import { RepoManager } from '../core/RepoManager';
import { Connection } from '../realtime/Connection';
import { Query } from './Query';

export const DataConnection = PersistentConnection;

/**
 * @param {!string} pathString
 * @param {function(*)} onComplete
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(PersistentConnection.prototype as any).simpleListen = function (
  pathString: string,
  onComplete: (a: unknown) => void
) {
  this.sendRequest('q', { p: pathString }, onComplete);
};

/**
 * @param {*} data
 * @param {function(*)} onEcho
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(PersistentConnection.prototype as any).echo = function (
  data: unknown,
  onEcho: (a: unknown) => void
) {
  this.sendRequest('echo', { d: data }, onEcho);
};

// RealTimeConnection properties that we use in tests.
export const RealTimeConnection = Connection;

/**
 * @param {function(): string} newHash
 * @return {function()}
 */
export const hijackHash = function (newHash: () => string) {
  const oldPut = PersistentConnection.prototype.put;
  PersistentConnection.prototype.put = function (
    pathString,
    data,
    onComplete,
    hash
  ) {
    if (hash !== undefined) {
      hash = newHash();
    }
    oldPut.call(this, pathString, data, onComplete, hash);
  };
  return function () {
    PersistentConnection.prototype.put = oldPut;
  };
};

/**
 * @type {function(new:RepoInfo, !string, boolean, !string, boolean): undefined}
 */
export const ConnectionTarget = RepoInfo;

/**
 * @param {!Query} query
 * @return {!string}
 */
export const queryIdentifier = function (query: Query) {
  return query.queryIdentifier();
};

/**
 * Forces the RepoManager to create Repos that use ReadonlyRestClient instead of PersistentConnection.
 *
 * @param {boolean} forceRestClient
 */
export const forceRestClient = function (forceRestClient: boolean) {
  RepoManager.getInstance().forceRestClient(forceRestClient);
};
