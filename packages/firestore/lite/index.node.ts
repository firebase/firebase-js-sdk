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

import { registerVersion, _registerComponent } from '@firebase/app-exp';
import { Firestore } from './src/api/database';
import { version } from '../package.json';
import { Component, ComponentType } from '@firebase/component';

import '../src/platform_node/node_init';

export {
  Firestore,
  initializeFirestore,
  getFirestore,
  terminate
} from './src/api/database';

export {
  DocumentReference,
  Query,
  CollectionReference,
  collection,
  doc,
  parent,
  getDoc,
  getQuery,
  deleteDoc,
  setDoc,
  updateDoc,
  addDoc
} from './src/api/reference';

// TOOD(firestorelite): Add tests when Queries are usable
export { FieldPath, documentId } from './src/api/field_path';

// TOOD(firestorelite): Add tests when setDoc() is available
export {
  FieldValue,
  deleteField,
  increment,
  arrayRemove,
  arrayUnion,
  serverTimestamp
} from './src/api/field_value';

export { DocumentSnapshot, QueryDocumentSnapshot } from './src/api/snapshot';

export { WriteBatch, writeBatch } from './src/api/write_batch';

export { Transaction, runTransaction } from './src/api/transaction';

export { setLogLevel } from '../src/util/log';

export function registerFirestore(): void {
  _registerComponent(
    new Component(
      'firestore/lite',
      container => {
        const app = container.getProvider('app-exp').getImmediate()!;
        return ((app, auth) => new Firestore(app, auth))(
          app,
          container.getProvider('auth-internal')
        );
      },
      ComponentType.PUBLIC
    )
  );
  registerVersion('firestore-lite', version, 'node');
}

registerFirestore();
