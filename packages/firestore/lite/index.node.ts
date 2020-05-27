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

import * as firestore from './index';

import { registerVersion, _registerComponent } from '@firebase/app-exp';
import {
  Firestore,
  initializeFirestore,
  getFirestore
} from './src/api/database';
import { version } from '../package.json';
import { Component, ComponentType } from '@firebase/component';

import '../src/platform_node/node_init';
import { DocumentReference, getDoc } from './src/api/reference';
import { DocumentSnapshot, QueryDocumentSnapshot } from './src/api/snapshot';

// TODO(firestorelite): Figure out a way to use `makeConstructorPrivate`
// without breaking tree-shaking
// export const PublicFirestore = makeConstructorPrivate(
//   Firestore,
//   'Use getFirestore() instead.'
// );

interface FirestoreNamespace {
  // TODO(firestorelite): Find a way to reference the public types for classes.
  Firestore: typeof Firestore;
  DocumentReference: typeof DocumentReference;
  DocumentSnapshot: typeof DocumentSnapshot;
  QueryDocumentSnapshot: typeof QueryDocumentSnapshot;

  // For free-standing functions, use the types from the .d.ts file as we
  // otherwise have no enforcement that our implementation matches our public
  // files.
  initializeFirestore: typeof firestore.initializeFirestore;
  getFirestore: typeof firestore.getFirestore;
  getDoc: typeof firestore.getDoc;
}

const firestoreNamespace: FirestoreNamespace = {
  Firestore,
  DocumentReference,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  initializeFirestore,
  getFirestore,
  getDoc
};

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
    ).setServiceProps({ ...firestoreNamespace })
  );
  registerVersion('firestore-lite', version, 'node');
}

registerFirestore();
