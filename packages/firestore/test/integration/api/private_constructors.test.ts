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

import { expect } from 'chai';

import firebase from '../util/firebase_export';

// allow using constructor with any
/* eslint-disable @typescript-eslint/no-explicit-any */

describe('Constructors', () => {
  it('are private for Firestore', () => {
    expect(() => new (firebase.firestore!.Firestore as any)('')).to.throw(
      'This constructor is private. Use firebase.firestore() instead.'
    );
  });

  it('are private for Transaction', () => {
    expect(() => new (firebase.firestore!.Transaction as any)('')).to.throw(
      'This constructor is private. Use firebase.firestore().runTransaction() instead.'
    );
  });

  it('are private for WriteBatch', () => {
    expect(() => new (firebase.firestore!.WriteBatch as any)('')).to.throw(
      'This constructor is private. Use firebase.firestore().batch() instead.'
    );
  });

  it('are private for DocumentReference', () => {
    expect(
      () => new (firebase.firestore!.DocumentReference as any)('')
    ).to.throw(
      'This constructor is private. Use firebase.firestore().doc() instead.'
    );
  });

  it('are private for Query', () => {
    expect(() => new (firebase.firestore!.Query as any)('')).to.throw(
      'This constructor is private.'
    );
  });

  it('are private for CollectionReference', () => {
    expect(
      () => new (firebase.firestore!.CollectionReference as any)('')
    ).to.throw(
      'This constructor is private. Use firebase.firestore().collection() instead.'
    );
  });

  it('are private for QuerySnapshot', () => {
    expect(() => new (firebase.firestore!.QuerySnapshot as any)('')).to.throw(
      'This constructor is private.'
    );
  });

  it('are private for DocumentSnapshot', () => {
    expect(
      () => new (firebase.firestore!.DocumentSnapshot as any)('')
    ).to.throw('This constructor is private.');
  });

  it('are private for QueryDocumentSnapshot', () => {
    expect(
      () => new (firebase.firestore!.QueryDocumentSnapshot as any)('')
    ).to.throw('This constructor is private.');
  });

  it('are private for Blob', () => {
    expect(() => new (firebase.firestore!.Blob as any)('')).to.throw(
      'This constructor is private.'
    );
  });

  it('are private for FieldValue', () => {
    expect(() => new (firebase.firestore!.FieldValue as any)('')).to.throw(
      'This constructor is private. Use FieldValue.<field>() instead.'
    );
  });
});
