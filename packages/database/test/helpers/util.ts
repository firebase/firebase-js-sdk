/**
 * @license
 * Copyright 2021 Google LLC
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

import { FirebaseApp, initializeApp } from '@firebase/app';
import { uuidv4 } from '@firebase/util';
import { expect } from 'chai';

import {
  Database,
  DatabaseReference,
  getDatabase,
  onValue,
  ref,
  set
} from '../../src';
import { ConnectionTarget } from '../../src/api/test_access';
import { Path } from '../../src/core/util/Path';

import { EventAccumulator } from './EventAccumulator';

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const TEST_PROJECT = require('../../../../config/project.json');
const EMULATOR_PORT = process.env.RTDB_EMULATOR_PORT;
const EMULATOR_NAMESPACE = process.env.RTDB_EMULATOR_NAMESPACE;
const USE_EMULATOR = !!EMULATOR_PORT;
console.log('using emulator: ', USE_EMULATOR);

let freshRepoId = 0;
const activeFreshApps: FirebaseApp[] = [];
export function getFreshRepo(path: Path) {
  const app = initializeApp(
    { databaseURL: DATABASE_URL },
    'ISOLATED_REPO_' + freshRepoId++
  );
  activeFreshApps.push(app);
  return ref(getDatabase(app), path.toString());
}

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

export function testRepoInfo(url) {
  const regex = /https?:\/\/(.*).firebaseio.com/;
  const match = url.match(regex);
  if (!match) {
    throw new Error('Couldnt get Namespace from passed URL');
  }
  const [, ns] = match;
  return new ConnectionTarget(`${ns}.firebaseio.com`, true, ns, false);
}

export function repoInfoForConnectionTest() {
  if (USE_EMULATOR) {
    return new ConnectionTarget(
      /* host = */ `localhost:${EMULATOR_PORT}`,
      /* secure (useSsl) = */ false, // emulator does not support https or wss
      /* namespace = */ EMULATOR_NAMESPACE,
      /* webSocketOnly = */ false
    );
  } else {
    return testRepoInfo(TEST_PROJECT.databaseURL);
  }
}

export function shuffle(arr, randFn = Math.random) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(randFn() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}

// Waits for specific number of milliseconds before resolving
// Example: await waitFor(4000) will wait until 4 seconds to execute the next line of code.
export function waitFor(waitTimeInMS: number) {
  return new Promise(resolve => setTimeout(resolve, waitTimeInMS));
}

// Creates a unique reference using uuid
export function getUniqueRef(db: Database) {
  const path = uuidv4();
  return ref(db, path);
}

// Get separate Reader and Writer Refs to prevent caching.
export function getRWRefs(db: Database) {
  const readerRef = getUniqueRef(db);
  const writerRef = getFreshRepo(readerRef._path);
  return { readerRef, writerRef };
}

// Validates that the ref was successfully written to.
export async function writeAndValidate(
  writerRef: DatabaseReference,
  readerRef: DatabaseReference,
  toWrite: unknown,
  ec: EventAccumulator
) {
  await set(writerRef, toWrite);
  onValue(readerRef, snapshot => {
    ec.addEvent(snapshot);
  });
  const [snap] = await ec.promise;
  expect(snap.val()).to.deep.eq(toWrite);
}

// Waits until callback function returns true
export async function waitUntil(cb: () => boolean, maxRetries = 5) {
  let count = 1;
  return new Promise((resolve, reject) => {
    if (cb()) {
      resolve(true);
    } else {
      if (count++ === maxRetries) {
        reject('waited too many times for conditional to be true');
      }
    }
  });
}
