/**
 * Copyright 2017 Google Inc.
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
import { CollectionReference, DocumentReference, DocumentSnapshot, Query, QuerySnapshot } from '../../../src/api/database';
import { collectionReference, documentReference, documentSnapshot, query, querySnapshot } from '../../util/api_helpers';
import { expectEqual, expectNotEqual } from '../../util/helpers';

describe('CollectionReference', () => {
  it('CollectionReference equality checks', () => {
    expectEqual(collectionReference('foo'), collectionReference('foo'));
    expectNotEqual(collectionReference('foo'), collectionReference('bar'));
  });
});

describe('DocumentReference', () => {
  it('DocumentReference equality checks', () => {
    expectEqual(documentReference('rooms/foo'), documentReference('rooms/foo'));
    expectNotEqual(
      documentReference('rooms/foo'),
      documentReference('rooms/bar')
    );
  });
});

describe('DocumentSnapshot', () => {
  it('DocumentSnapshot equality checks', () => {
    expectEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/foo', { a: 1 }, true)
    );
    expectEqual(
      documentSnapshot('rooms/foo', null, true),
      documentSnapshot('rooms/foo', null, true)
    );
    // will do both !left.isEqual(right) and !right.isEqual(left).
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/foo', null, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { a: 1 }, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { b: 1 }, true)
    );
    expectNotEqual(
      documentSnapshot('rooms/foo', { a: 1 }, true),
      documentSnapshot('rooms/bar', { a: 1 }, false)
    );
  });
});

describe('Query', () => {
  it('Query equality checks', () => {
    expectEqual(query('foo'), query('foo'));
    expectNotEqual(query('foo'), query('bar'));
  });
});

describe('QuerySnapshot', () => {
  it('QuerySnapshot equality checks', () => {
    expectEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('bar', {}, { 'a': { a: 1 } }, true, false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', { 'b': { b: 1 } }, { 'a': { a: 1 } }, true, false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', {}, { 'a': { b: 1 } }, true, false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', {}, { 'a': { a: 1 } }, false, false, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, true, false)
    );
    expectNotEqual(
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, false),
      querySnapshot('foo', {}, { 'a': { a: 1 } }, true, false, true)
    );
  });
});
