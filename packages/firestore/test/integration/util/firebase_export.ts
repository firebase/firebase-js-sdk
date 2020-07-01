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

// Imports firebase via the raw sources and re-exports it.
// This file exists so that the "<repo-root>/integration/firestore" test suite
// can replace this file reference with a reference to the minified sources
// instead.

import * as firestore from '@firebase/firestore-types';

import firebase from '@firebase/app';
import * as exp from './experimental_sdk_shim';

let FieldValue: typeof firestore.FieldValue;
let FieldPath: typeof firestore.FieldPath;
let Timestamp: typeof firestore.Timestamp;
let Blob: typeof firestore.Blob;
let GeoPoint: typeof firestore.GeoPoint;

if ('firestore' in firebase) {
  // We only register firebase.firestore if the tests are run against the
  // legacy SDK. To prevent a compile-time error with the firestore-exp
  // SDK, we cast to `any`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const firestoreNamespace = (firebase as any).firestore;
  FieldValue = firestoreNamespace.FieldValue;
  FieldPath = firestoreNamespace.FieldPath;
  Timestamp = firestoreNamespace.Timestamp;
  Blob = firestoreNamespace.Blob;
  GeoPoint = firestoreNamespace.GeoPoint;
} else {
  FieldValue = exp.FieldValue;
  FieldPath = exp.FieldPath;
  Timestamp = exp.Timestamp;
  Blob = exp.Blob as any; // TODO(mrschmidt): fix
  GeoPoint = exp.GeoPoint;
}

export { FieldValue, FieldPath, Timestamp, Blob, GeoPoint };
