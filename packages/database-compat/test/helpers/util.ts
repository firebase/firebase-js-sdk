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

declare let MozWebSocket: WebSocket;

import '../../src/index';

import firebase from '@firebase/app-compat';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';

import { Path } from '../../../database/src/core/util/Path';
import { Query, Reference } from '../../src/api/Reference';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../../config/project.json');

const EMULATOR_PORT = process.env.RTDB_EMULATOR_PORT;
const EMULATOR_NAMESPACE = process.env.RTDB_EMULATOR_NAMESPACE;

const USE_EMULATOR = !!EMULATOR_PORT;

/*
 * When running against the emulator, the hostname will be "localhost" rather
 * than "<namespace>.firebaseio.com", and so we need to append the namespace
 * as a query param.
 *
 * Some tests look for hostname only while others need full url (with the
 * namespace provided as a query param), hence below declarations.
 */
export const DATABASE_ADDRESS = USE_EMULATOR
  ? `http://localhost:${EMULATOR_PORT}`
  : TEST_PROJECT.databaseURL;

export const DATABASE_URL = USE_EMULATOR
  ? `${DATABASE_ADDRESS}?ns=${EMULATOR_NAMESPACE}`
  : TEST_PROJECT.databaseURL;

console.log(`USE_EMULATOR: ${USE_EMULATOR}. DATABASE_URL: ${DATABASE_URL}.`);

let numDatabases = 0;

// mock authentication functions for testing
(firebase as unknown as _FirebaseNamespace).INTERNAL.registerComponent(
  new Component(
    'auth-internal',
    () => ({
      getToken: async () => null,
      addAuthTokenListener: () => {},
      removeAuthTokenListener: () => {},
      getUid: () => null
    }),
    ComponentType.PRIVATE
  )
);

export function createTestApp() {
  const app = firebase.initializeApp({ databaseURL: DATABASE_URL });
  return app;
}

/**
 * Gets or creates a root node to the test namespace. All calls sharing the
 * value of opt_i will share an app context.
 */
export function getRootNode(i = 0, ref?: string) {
  if (i + 1 > numDatabases) {
    numDatabases = i + 1;
  }
  let app;
  try {
    app = firebase.app('TEST-' + i);
  } catch (e) {
    app = firebase.initializeApp({ databaseURL: DATABASE_URL }, 'TEST-' + i);
  }
  const db = app.database();
  return db.ref(ref);
}

/**
 * Create multiple refs to the same top level
 * push key - each on it's own Firebase.Context.
 */
export function getRandomNode(numNodes?): Reference | Reference[] {
  if (numNodes === undefined) {
    return getRandomNode(1)[0] as Reference;
  }

  let child;
  const nodeList = [];
  for (let i = 0; i < numNodes; i++) {
    const ref = getRootNode(i);
    if (child === undefined) {
      child = ref.push().key;
    }

    nodeList[i] = ref.child(child);
  }

  return nodeList as Reference[];
}

export function getQueryValue(query: Query) {
  return query.once('value').then(snap => snap.val());
}

export function pause(milliseconds: number) {
  return new Promise<void>(resolve => {
    setTimeout(() => resolve(), milliseconds);
  });
}

export function getPath(query: Query) {
  return query.toString().replace(DATABASE_ADDRESS, '');
}

export function shuffle(arr, randFn = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

let freshRepoId = 1;
const activeFreshApps = [];

export function getFreshRepo(path: Path) {
  const app = firebase.initializeApp(
    { databaseURL: DATABASE_URL },
    'ISOLATED_REPO_' + freshRepoId++
  );
  activeFreshApps.push(app);
  return (app as any).database().ref(path.toString());
}

export function getFreshRepoFromReference(ref) {
  const host = ref.root.toString();
  const path = ref.toString().replace(host, '');
  return getFreshRepo(path);
}

// Little helpers to get the currently cached snapshot / value.
export function getSnap(path) {
  let snap;
  const callback = function (snapshot) {
    snap = snapshot;
  };
  path.once('value', callback);
  return snap;
}

export function getVal(path) {
  const snap = getSnap(path);
  return snap ? snap.val() : undefined;
}

export function canCreateExtraConnections() {
  return (
    typeof MozWebSocket !== 'undefined' || typeof WebSocket !== 'undefined'
  );
}
