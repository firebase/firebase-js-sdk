/**
 * @license
 * Copyright 2020 Google LLC
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

// eslint-disable-next-line import/no-extraneous-dependencies
import { _registerComponent, registerVersion } from '@firebase/app-exp';
import { Component, ComponentType } from '@firebase/component';

import { version } from '../package.json';
import {
  FirebaseDatabase,
  repoManagerDatabaseFromApp
} from '../src/exp/Database';

export {
  enableLogging,
  getDatabase,
  goOffline,
  goOnline,
  useDatabaseEmulator
} from '../src/exp/Database';
export {
  Query,
  Reference,
  ListenOptions,
  Unsubscribe,
  ThenableReference,
  OnDisconnect
} from '../src/exp/Reference';
export {
  QueryConstraint,
  DataSnapshot,
  EventType,
  endAt,
  endBefore,
  equalTo,
  get,
  limitToFirst,
  limitToLast,
  off,
  onChildAdded,
  onChildChanged,
  onChildMoved,
  onChildRemoved,
  onValue,
  orderByChild,
  orderByKey,
  orderByPriority,
  orderByValue,
  query,
  startAfter,
  startAt,
  ref,
  refFromURL
} from '../src/exp/Reference_impl';
export { increment, serverTimestamp } from '../src/exp/ServerValue';
export { runTransaction, TransactionOptions } from '../src/exp/Transaction';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'database-exp': FirebaseDatabase;
  }
}

function registerDatabase(): void {
  _registerComponent(
    new Component(
      'database-exp',
      (container, { instanceIdentifier: url }) => {
        const app = container.getProvider('app-exp').getImmediate()!;
        const authProvider = container.getProvider('auth-internal');
        return repoManagerDatabaseFromApp(app, authProvider, url);
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );
  registerVersion('database-exp', version, 'node');
}

registerDatabase();
