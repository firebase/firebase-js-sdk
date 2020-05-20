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

// Export the classes with a private constructor (it will fail if invoked
// at runtime). Note that this still allows instanceof checks.

// We're treating the variables as class names, so disable checking for lower
// case variable names.
import { FieldValue } from './field_value';
import { Blob } from './blob';
import {
  CollectionReference,
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  Query,
  QueryDocumentSnapshot,
  QuerySnapshot,
  Transaction,
  WriteBatch
} from './database';
import { Code, FirestoreError } from '../util/error';

/**
 * Helper function to prevent instantiation through the constructor.
 *
 * This method creates a new constructor that throws when it's invoked.
 * The prototype of that constructor is then set to the prototype of the hidden
 * "class" to expose all the prototype methods and allow for instanceof
 * checks.
 *
 * To also make all the static methods available, all properties of the
 * original constructor are copied to the new constructor.
 */
export function makeConstructorPrivate<T extends Function>(
  cls: T,
  optionalMessage?: string
): T {
  function PublicConstructor(): never {
    let error = 'This constructor is private.';
    if (optionalMessage) {
      error += ' ';
      error += optionalMessage;
    }
    throw new FirestoreError(Code.INVALID_ARGUMENT, error);
  }

  // Make sure instanceof checks work and all methods are exposed on the public
  // constructor
  PublicConstructor.prototype = cls.prototype;

  // Copy any static methods/members
  Object.assign(PublicConstructor, cls);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PublicConstructor as any;
}

export const PublicFirestore = makeConstructorPrivate(
  Firestore,
  'Use firebase.firestore() instead.'
);
export const PublicTransaction = makeConstructorPrivate(
  Transaction,
  'Use firebase.firestore().runTransaction() instead.'
);
export const PublicWriteBatch = makeConstructorPrivate(
  WriteBatch,
  'Use firebase.firestore().batch() instead.'
);
export const PublicDocumentReference = makeConstructorPrivate(
  DocumentReference,
  'Use firebase.firestore().doc() instead.'
);
export const PublicDocumentSnapshot = makeConstructorPrivate(DocumentSnapshot);
export const PublicQueryDocumentSnapshot = makeConstructorPrivate(
  QueryDocumentSnapshot
);
export const PublicQuery = makeConstructorPrivate(Query);
export const PublicQuerySnapshot = makeConstructorPrivate(QuerySnapshot);
export const PublicCollectionReference = makeConstructorPrivate(
  CollectionReference,
  'Use firebase.firestore().collection() instead.'
);
export const PublicFieldValue = makeConstructorPrivate(
  FieldValue,
  'Use FieldValue.<field>() instead.'
);
export const PublicBlob = makeConstructorPrivate(
  Blob,
  'Use Blob.fromUint8Array() or Blob.fromBase64String() instead.'
);
