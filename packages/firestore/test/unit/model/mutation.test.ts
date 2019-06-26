/**
 * @license
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
import { PublicFieldValue as FieldValue } from '../../../src/api/field_value';
import { Timestamp } from '../../../src/api/timestamp';
import { Document, MaybeDocument } from '../../../src/model/document';
import {
  IntegerValue,
  ServerTimestampValue,
  TimestampValue
} from '../../../src/model/field_value';
import {
  Mutation,
  MutationResult,
  Precondition
} from '../../../src/model/mutation';
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation
} from '../../../src/model/transform_operation';
import { Dict } from '../../../src/util/obj';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  DELETE_SENTINEL,
  deletedDoc,
  deleteMutation,
  doc,
  field,
  key,
  mutationResult,
  patchMutation,
  setMutation,
  transformMutation,
  unknownDoc,
  version,
  wrap,
  wrapObject
} from '../../util/helpers';

describe('Mutation', () => {
  addEqualityMatcher();

  const timestamp = Timestamp.now();

  it('can apply sets to documents', () => {
    const docData = { foo: 'foo-value', baz: 'baz-value' };
    const baseDoc = doc('collection/key', 0, docData);

    const set = setMutation('collection/key', { bar: 'bar-value' });
    const setDoc = set.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(setDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { bar: 'bar-value' },
        { hasLocalMutations: true }
      )
    );
  });

  it('can apply patches to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const baseDoc = doc('collection/key', 0, docData);
    const patch = patchMutation('collection/key', {
      'foo.bar': 'new-bar-value'
    });

    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { foo: { bar: 'new-bar-value' }, baz: 'baz-value' },
        { hasLocalMutations: true }
      )
    );
  });

  it('can apply patches with merges to missing documents', () => {
    const timestamp = Timestamp.now();

    const baseDoc = deletedDoc('collection/key', 0);
    const patch = patchMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      Precondition.NONE
    );

    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { foo: { bar: 'new-bar-value' } },
        { hasLocalMutations: true }
      )
    );
  });

  it('can apply patches with merges to null documents', () => {
    const timestamp = Timestamp.now();

    const baseDoc = null;
    const patch = patchMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      Precondition.NONE
    );

    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { foo: { bar: 'new-bar-value' } },
        { hasLocalMutations: true }
      )
    );
  });

  it('will delete values from the field-mask', () => {
    const baseDoc = doc('collection/key', 0, {
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
    const patch = patchMutation('collection/key', {
      'foo.bar': DELETE_SENTINEL
    });

    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { foo: { baz: 'baz-value' } },
        { hasLocalMutations: true }
      )
    );
  });

  it('will patch a primitive value', () => {
    const baseDoc = doc('collection/key', 0, {
      foo: 'foo-value',
      baz: 'baz-value'
    });
    const patch = patchMutation('collection/key', {
      'foo.bar': 'new-bar-value'
    });

    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        0,
        { foo: { bar: 'new-bar-value' }, baz: 'baz-value' },
        { hasLocalMutations: true }
      )
    );
  });

  it('patching a NoDocument yields a NoDocument', () => {
    const baseDoc = deletedDoc('collection/key', 0);
    const patch = patchMutation('collection/key', { foo: 'bar' });
    const patchedDoc = patch.applyToLocalView(baseDoc, baseDoc, timestamp);
    expect(patchedDoc).to.deep.equal(baseDoc);
  });

  it('can apply local serverTimestamp transforms to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', {
      'foo.bar': FieldValue.serverTimestamp()
    });

    const transformedDoc = transform.applyToLocalView(
      baseDoc,
      baseDoc,
      timestamp
    );

    // Server timestamps aren't parsed, so we manually insert it.
    const data = wrapObject({
      foo: { bar: '<server-timestamp>' },
      baz: 'baz-value'
    }).set(field('foo.bar'), new ServerTimestampValue(timestamp, null));
    const expectedDoc = new Document(key('collection/key'), version(0), data, {
      hasLocalMutations: true
    });

    expect(transformedDoc).to.deep.equal(expectedDoc);
  });

  // NOTE: This is more a test of UserDataConverter code than Mutation code but
  // we don't have unit tests for it currently. We could consider removing this
  // test once we have integration tests.
  it('can create arrayUnion() transform.', () => {
    const transform = transformMutation('collection/key', {
      foo: FieldValue.arrayUnion('tag'),
      'bar.baz': FieldValue.arrayUnion(true, { nested: { a: [1, 2] } })
    });
    expect(transform.fieldTransforms.length).to.equal(2);

    const first = transform.fieldTransforms[0];
    expect(first.field).to.deep.equal(field('foo'));
    expect(first.transform).to.deep.equal(
      new ArrayUnionTransformOperation([wrap('tag')])
    );

    const second = transform.fieldTransforms[1];
    expect(second.field).to.deep.equal(field('bar.baz'));
    expect(second.transform).to.deep.equal(
      new ArrayUnionTransformOperation([
        wrap(true),
        wrap({ nested: { a: [1, 2] } })
      ])
    );
  });

  // NOTE: This is more a test of UserDataConverter code than Mutation code but
  // we don't have unit tests for it currently. We could consider removing this
  // test once we have integration tests.
  it('can create arrayRemove() transform.', () => {
    const transform = transformMutation('collection/key', {
      foo: FieldValue.arrayRemove('tag')
    });
    expect(transform.fieldTransforms.length).to.equal(1);

    const first = transform.fieldTransforms[0];
    expect(first.field).to.deep.equal(field('foo'));
    expect(first.transform).to.deep.equal(
      new ArrayRemoveTransformOperation([wrap('tag')])
    );
  });

  it('can apply local arrayUnion transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: FieldValue.arrayUnion(1, 2) };
    const expected = { missing: [1, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform to non-array field', () => {
    const baseDoc = { 'non-array': 42 };
    const transform = { 'non-array': FieldValue.arrayUnion(1, 2) };
    const expected = { 'non-array': [1, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with non-existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: FieldValue.arrayUnion(2, 4) };
    const expected = { array: [1, 3, 2, 4] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: FieldValue.arrayUnion(1, 3) };
    const expected = { array: [1, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with duplicate existing elements', () => {
    // Duplicate entries in your existing array should be preserved.
    const baseDoc = { array: [1, 2, 2, 3] };
    const transform = { array: FieldValue.arrayUnion(2) };
    const expected = { array: [1, 2, 2, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with duplicate union elements', () => {
    // Duplicate entries in your union array should only be added once.
    const baseDoc = { array: [1, 3] };
    const transform = { array: FieldValue.arrayUnion(2, 2) };
    const expected = { array: [1, 3, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with non-primitive elements', () => {
    // Union nested object values (one existing, one not).
    const baseDoc = { array: [1, { a: 'b' }] };
    const transform = { array: FieldValue.arrayUnion({ a: 'b' }, { c: 'd' }) };
    const expected = { array: [1, { a: 'b' }, { c: 'd' }] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with partially-overlapping elements', () => {
    // Union objects that partially overlap an existing object.
    const baseDoc = { array: [1, { a: 'b', c: 'd' }] };
    const transform = { array: FieldValue.arrayUnion({ a: 'b' }, { c: 'd' }) };
    const expected = { array: [1, { a: 'b', c: 'd' }, { a: 'b' }, { c: 'd' }] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: FieldValue.arrayRemove(1, 2) };
    const expected = { missing: [] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform to non-array field', () => {
    const baseDoc = { 'non-array': 42 };
    const transform = { 'non-array': FieldValue.arrayRemove(1, 2) };
    const expected = { 'non-array': [] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with non-existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: FieldValue.arrayRemove(2, 4) };
    const expected = { array: [1, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with existing elements', () => {
    const baseDoc = { array: [1, 2, 3, 4] };
    const transform = { array: FieldValue.arrayRemove(1, 3) };
    const expected = { array: [2, 4] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with non-primitive elements', () => {
    // Remove nested object values (one existing, one not).
    const baseDoc = { array: [1, { a: 'b' }] };
    const transform = {
      array: FieldValue.arrayRemove({ a: 'b' }, { c: 'd' })
    };
    const expected = { array: [1] };
    verifyTransform(baseDoc, transform, expected);
  });

  function verifyTransform(
    baseData: Dict<unknown>,
    transformData: Dict<unknown> | Array<Dict<unknown>>,
    expectedData: Dict<unknown>
  ): void {
    const baseDoc = doc('collection/key', 0, baseData);
    let transformedDoc: MaybeDocument | null = baseDoc;

    const transforms = Array.isArray(transformData)
      ? transformData
      : [transformData];

    for (const transformData of transforms) {
      const transform = transformMutation('collection/key', transformData);
      transformedDoc = transform.applyToLocalView(
        transformedDoc,
        transformedDoc,
        timestamp
      );
    }

    const expectedDoc = doc('collection/key', 0, expectedData, {
      hasLocalMutations: true
    });
    expect(transformedDoc).to.deep.equal(expectedDoc);
  }

  it('can apply server-acked serverTimestamp transform to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', {
      'foo.bar': FieldValue.serverTimestamp()
    });

    const mutationResult = new MutationResult(version(1), [
      new TimestampValue(timestamp)
    ]);
    const transformedDoc = transform.applyToRemoteDocument(
      baseDoc,
      mutationResult
    );

    expect(transformedDoc).to.deep.equal(
      doc(
        'collection/key',
        1,
        { foo: { bar: timestamp.toDate() }, baz: 'baz-value' },
        { hasCommittedMutations: true }
      )
    );
  });

  it('can apply server-acked array transforms to document', () => {
    const docData = { array1: [1, 2], array2: ['a', 'b'] };
    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', {
      array1: FieldValue.arrayUnion(2, 3),
      array2: FieldValue.arrayRemove('a', 'c')
    });

    // Server just sends null transform results for array operations.
    const mutationResult = new MutationResult(version(1), [null, null]);
    const transformedDoc = transform.applyToRemoteDocument(
      baseDoc,
      mutationResult
    );

    expect(transformedDoc).to.deep.equal(
      doc(
        'collection/key',
        1,
        { array1: [1, 2, 3], array2: ['b'] },
        { hasCommittedMutations: true }
      )
    );
  });

  it('can apply numeric add transform to document', () => {
    const baseDoc = {
      longPlusLong: 1,
      longPlusDouble: 2,
      doublePlusLong: 3.3,
      doublePlusDouble: 4.0,
      longPlusNan: 5,
      doublePlusNan: 6.6,
      longPlusInfinity: 7,
      doublePlusInfinity: 8.8
    };
    const transform = {
      longPlusLong: FieldValue.increment(1),
      longPlusDouble: FieldValue.increment(2.2),
      doublePlusLong: FieldValue.increment(3),
      doublePlusDouble: FieldValue.increment(4.4),
      longPlusNan: FieldValue.increment(Number.NaN),
      doublePlusNan: FieldValue.increment(Number.NaN),
      longPlusInfinity: FieldValue.increment(Number.POSITIVE_INFINITY),
      doublePlusInfinity: FieldValue.increment(Number.POSITIVE_INFINITY)
    };
    const expected = {
      longPlusLong: 2,
      longPlusDouble: 4.2,
      doublePlusLong: 6.3,
      doublePlusDouble: 8.4,
      longPlusNan: Number.NaN,
      doublePlusNan: Number.NaN,
      longPlusInfinity: Number.POSITIVE_INFINITY,
      doublePlusInfinity: Number.POSITIVE_INFINITY
    };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply numeric add transform to unexpected type', () => {
    const baseDoc = { stringVal: 'zero' };
    const transform = { stringVal: FieldValue.increment(1) };
    const expected = { stringVal: 1 };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply numeric add transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: FieldValue.increment(1) };
    const expected = { missing: 1 };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply numeric add transforms consecutively', () => {
    const baseDoc = { numberVal: 1 };
    const transform1 = { numberVal: FieldValue.increment(2) };
    const transform2 = { numberVal: FieldValue.increment(3) };
    const transform3 = { numberVal: FieldValue.increment(4) };
    const expected = { numberVal: 10 };
    verifyTransform(baseDoc, [transform1, transform2, transform3], expected);
  });

  // PORTING NOTE: The `increment()` overflow/underflow tests from Android/iOS
  // are not applicable to Web since we expose JavaScript's number arithmetic
  // directly.

  it('can apply server-acked numeric add transform to document', () => {
    const docData = { sum: 1 };
    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', {
      sum: FieldValue.increment(2)
    });

    const mutationResult = new MutationResult(version(1), [
      new IntegerValue(3)
    ]);
    const transformedDoc = transform.applyToRemoteDocument(
      baseDoc,
      mutationResult
    );

    expect(transformedDoc).to.deep.equal(
      doc('collection/key', 1, { sum: 3 }, { hasCommittedMutations: true })
    );
  });

  it('can apply deletes to documents', () => {
    const baseDoc = doc('collection/key', 0, { foo: 'bar' });

    const mutation = deleteMutation('collection/key');
    const result = mutation.applyToLocalView(baseDoc, baseDoc, Timestamp.now());
    expect(result).to.deep.equal(deletedDoc('collection/key', 0));
  });

  it('can apply sets with mutation results', () => {
    const baseDoc = doc('collection/key', 0, { foo: 'bar' });

    const docSet = setMutation('collection/key', { foo: 'new-bar' });
    const setResult = mutationResult(4);
    const setDoc = docSet.applyToRemoteDocument(baseDoc, setResult);
    expect(setDoc).to.deep.equal(
      doc(
        'collection/key',
        4,
        { foo: 'new-bar' },
        { hasCommittedMutations: true }
      )
    );
  });

  it('will apply patches with mutation results', () => {
    const baseDoc = doc('collection/key', 0, { foo: 'bar' });

    const mutation = patchMutation('collection/key', { foo: 'new-bar' });
    const result = mutationResult(5);
    const patchedDoc = mutation.applyToRemoteDocument(baseDoc, result);
    expect(patchedDoc).to.deep.equal(
      doc(
        'collection/key',
        5,
        { foo: 'new-bar' },
        {
          hasCommittedMutations: true
        }
      )
    );
  });

  function assertVersionTransitions(
    mutation: Mutation,
    base: MaybeDocument | null,
    mutationResult: MutationResult,
    expected: MaybeDocument | null
  ): void {
    const actual = mutation.applyToRemoteDocument(base, mutationResult);
    expect(actual).to.deep.equal(expected);
  }

  it('transitions versions correctly', () => {
    const docV3 = doc('collection/key', 3, {});
    const deletedV3 = deletedDoc('collection/key', 3);

    const set = setMutation('collection/key', {});
    const patch = patchMutation('collection/key', {});
    const transform = transformMutation('collection/key', {});
    const deleter = deleteMutation('collection/key');

    const mutationResult = new MutationResult(
      version(7),
      /*transformResults=*/ null
    );
    const transformResult = new MutationResult(version(7), []);
    const docV7Unknown = unknownDoc('collection/key', 7);
    const docV7Deleted = deletedDoc('collection/key', 7, {
      hasCommittedMutations: true
    });
    const docV7Committed = doc(
      'collection/key',
      7,
      {},
      { hasCommittedMutations: true }
    );

    assertVersionTransitions(set, docV3, mutationResult, docV7Committed);
    assertVersionTransitions(set, deletedV3, mutationResult, docV7Committed);
    assertVersionTransitions(set, null, mutationResult, docV7Committed);

    assertVersionTransitions(patch, docV3, mutationResult, docV7Committed);
    assertVersionTransitions(patch, deletedV3, mutationResult, docV7Unknown);
    assertVersionTransitions(patch, null, mutationResult, docV7Unknown);

    assertVersionTransitions(transform, docV3, transformResult, docV7Committed);
    assertVersionTransitions(
      transform,
      deletedV3,
      transformResult,
      docV7Unknown
    );
    assertVersionTransitions(transform, null, transformResult, docV7Unknown);

    assertVersionTransitions(deleter, docV3, mutationResult, docV7Deleted);
    assertVersionTransitions(deleter, deletedV3, mutationResult, docV7Deleted);
    assertVersionTransitions(deleter, null, mutationResult, docV7Deleted);
  });
});
