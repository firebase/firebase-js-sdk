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

import { PersistentConnection } from '../core/PersistentConnection';
import { RepoInfo } from '../core/RepoInfo';
import { Connection } from '../realtime/Connection';

import { repoManagerForceRestClient } from './Database';

export const DataConnection = PersistentConnection;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(PersistentConnection.prototype as any).simpleListen = function (
  pathString: string,
  onComplete: (a: unknown) => void
) {
  this.sendRequest('q', { p: pathString }, onComplete);
};

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
 * @internal
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

export const ConnectionTarget = RepoInfo;

/**
 * Forces the RepoManager to create Repos that use ReadonlyRestClient instead of PersistentConnection.
 * @internal
 */
export const forceRestClient = function (forceRestClient: boolean) {
  repoManagerForceRestClient(forceRestClient);
};
