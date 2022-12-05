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

import {
  arrayRemove,
  arrayUnion,
  increment,
  Timestamp,
  serverTimestamp,
  deleteField
} from '../../../src';
import { MutableDocument } from '../../../src/model/document';
import { FieldMask } from '../../../src/model/field_mask';
import {
  mutationApplyToLocalView,
  mutationApplyToRemoteDocument,
  mutationExtractBaseValue,
  Mutation,
  MutationResult,
  Precondition,
  calculateOverlayMutation
} from '../../../src/model/mutation';
import { serverTimestamp as serverTimestampInternal } from '../../../src/model/server_timestamps';
import {
  ArrayRemoveTransformOperation,
  ArrayUnionTransformOperation
} from '../../../src/model/transform_operation';
import { Dict } from '../../../src/util/obj';
import { addEqualityMatcher } from '../../util/equality_matcher';
import {
  computeCombinations,
  computePermutations,
  deletedDoc,
  deleteMutation,
  doc,
  field,
  invalidDoc,
  key,
  mergeMutation,
  mutationResult,
  patchMutation,
  setMutation,
  unknownDoc,
  version,
  wrap,
  wrapObject
} from '../../util/helpers';

describe('Mutation', () => {
  addEqualityMatcher();

  const timestamp = Timestamp.now();

  /**
   * For each document in `docs`, calculate the overlay mutations of each
   * possible permutation, check whether this holds:
   * document + overlay_mutation = document + mutation_list
   * Returns how many cases it has run.
   */
  function runPermutationTests(
    docs: MutableDocument[],
    mutations: Mutation[]
  ): number {
    let testCases = 0;
    const permutations = computePermutations(mutations);
    docs.forEach(doc => {
      permutations.forEach(permutation => {
        verifyOverlayRoundTrips(doc, ...permutation);
        testCases++;
      });
    });
    return testCases;
  }

  function getDescription(
    document: MutableDocument,
    mutations: Mutation[],
    overlay: Mutation | null
  ): string {
    let result = 'Overlay Mutation failed with:\n';
    result += 'document:\n';
    result += document.toString();
    result += '\n\n';

    result += 'mutations:\n';
    mutations.forEach(mutation => {
      result += mutation.toString() + '\n';
    });
    result += '\n';

    result += 'overlay:\n';
    result += overlay === null ? 'null' : overlay.toString();
    result += '\n\n';
    return result;
  }

  function verifyOverlayRoundTrips(
    doc: MutableDocument,
    ...mutations: Mutation[]
  ): void {
    const docForMutations = doc.mutableCopy();
    const docForOverlay = doc.mutableCopy();

    let mask: FieldMask | null = null;
    for (const mutation of mutations) {
      mask = mutationApplyToLocalView(
        mutation,
        docForMutations,
        mask,
        timestamp
      );
    }

    const overlay = calculateOverlayMutation(docForMutations, mask);
    if (overlay !== null) {
      mutationApplyToLocalView(
        overlay,
        docForOverlay,
        /* previousMask= */ null,
        timestamp
      );
    }

    expect(docForOverlay).to.deep.equal(
      docForMutations,
      getDescription(doc, mutations, overlay)
    );
  }

  it('can apply sets to documents', () => {
    const docData = { foo: 'foo-value', baz: 'baz-value' };
    const document = doc('collection/key', 0, docData);

    const set = setMutation('collection/key', { bar: 'bar-value' });
    mutationApplyToLocalView(
      set,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, { bar: 'bar-value' }).setHasLocalMutations()
    );
  });

  it('can apply patches to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const document = doc('collection/key', 0, docData);
    const patch = patchMutation('collection/key', {
      'foo.bar': 'new-bar-value'
    });

    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, {
        foo: { bar: 'new-bar-value' },
        baz: 'baz-value'
      }).setHasLocalMutations()
    );
  });

  it('can apply patches with merges to missing documents', () => {
    const timestamp = Timestamp.now();

    const document = deletedDoc('collection/key', 0);
    const patch = patchMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      Precondition.none()
    );

    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, {
        foo: { bar: 'new-bar-value' }
      }).setHasLocalMutations()
    );
  });

  it('can apply patches with merges to null documents', () => {
    const timestamp = Timestamp.now();

    const document = MutableDocument.newInvalidDocument(key('collection/key'));
    const patch = patchMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      Precondition.none()
    );

    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, {
        foo: { bar: 'new-bar-value' }
      }).setHasLocalMutations()
    );
  });

  it('will delete values from the field-mask', () => {
    const document = doc('collection/key', 0, {
      foo: { bar: 'bar-value', baz: 'baz-value' }
    });
    const patch = patchMutation('collection/key', {
      'foo.bar': deleteField()
    });

    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, {
        foo: { baz: 'baz-value' }
      }).setHasLocalMutations()
    );
  });

  it('will patch a primitive value', () => {
    const document = doc('collection/key', 0, {
      foo: 'foo-value',
      baz: 'baz-value'
    });
    const patch = patchMutation('collection/key', {
      'foo.bar': 'new-bar-value'
    });

    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(
      doc('collection/key', 0, {
        foo: { bar: 'new-bar-value' },
        baz: 'baz-value'
      }).setHasLocalMutations()
    );
  });

  it('patching a NoDocument yields a NoDocument', () => {
    const document = deletedDoc('collection/key', 0);
    const patch = patchMutation('collection/key', { foo: 'bar' });
    mutationApplyToLocalView(
      patch,
      document,
      /* previousMask= */ null,
      timestamp
    );
    expect(document).to.deep.equal(deletedDoc('collection/key', 0));
  });

  it('can apply local serverTimestamp transforms to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const document = doc('collection/key', 0, docData);
    const transform = patchMutation('collection/key', {
      'foo.bar': serverTimestamp()
    });

    mutationApplyToLocalView(
      transform,
      document,
      /* previousMask= */ null,
      timestamp
    );

    // Server timestamps aren't parsed, so we manually insert it.
    const data = wrapObject({
      foo: { bar: '<server-timestamp>' },
      baz: 'baz-value'
    });
    data.set(field('foo.bar'), serverTimestampInternal(timestamp, null));
    const expectedDoc = doc('collection/key', 0, data).setHasLocalMutations();

    expect(document).to.deep.equal(expectedDoc);
  });

  // NOTE: This is more a test of UserDataReader code than Mutation code but
  // we don't have unit tests for it currently. We could consider removing this
  // test once we have integration tests.
  it('can create arrayUnion() transform.', () => {
    const transform = patchMutation('collection/key', {
      a: arrayUnion('tag'),
      'bar.baz': arrayUnion(true, { nested: { a: [1, 2] } })
    });
    expect(transform.fieldTransforms).to.have.lengthOf(2);

    const first = transform.fieldTransforms[0];
    expect(first.field).to.deep.equal(field('a'));
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

  // NOTE: This is more a test of UserDataReader code than Mutation code but
  // we don't have unit tests for it currently. We could consider removing this
  // test once we have integration tests.
  it('can create arrayRemove() transform.', () => {
    const transform = patchMutation('collection/key', {
      foo: arrayRemove('tag')
    });
    expect(transform.fieldTransforms).to.have.lengthOf(1);

    const first = transform.fieldTransforms[0];
    expect(first.field).to.deep.equal(field('foo'));
    expect(first.transform).to.deep.equal(
      new ArrayRemoveTransformOperation([wrap('tag')])
    );
  });

  it('can apply local arrayUnion transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: arrayUnion(1, 2) };
    const expected = { missing: [1, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform to non-array field', () => {
    const baseDoc = { 'non-array': 42 };
    const transform = { 'non-array': arrayUnion(1, 2) };
    const expected = { 'non-array': [1, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with non-existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: arrayUnion(2, 4) };
    const expected = { array: [1, 3, 2, 4] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: arrayUnion(1, 3) };
    const expected = { array: [1, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with duplicate existing elements', () => {
    // Duplicate entries in your existing array should be preserved.
    const baseDoc = { array: [1, 2, 2, 3] };
    const transform = { array: arrayUnion(2) };
    const expected = { array: [1, 2, 2, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with duplicate union elements', () => {
    // Duplicate entries in your union array should only be added once.
    const baseDoc = { array: [1, 3] };
    const transform = { array: arrayUnion(2, 2) };
    const expected = { array: [1, 3, 2] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with non-primitive elements', () => {
    // Union nested object values (one existing, one not).
    const baseDoc = { array: [1, { a: 'b' }] };
    const transform = { array: arrayUnion({ a: 'b' }, { c: 'd' }) };
    const expected = { array: [1, { a: 'b' }, { c: 'd' }] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayUnion transform with partially-overlapping elements', () => {
    // Union objects that partially overlap an existing object.
    const baseDoc = { array: [1, { a: 'b', c: 'd' }] };
    const transform = { array: arrayUnion({ a: 'b' }, { c: 'd' }) };
    const expected = { array: [1, { a: 'b', c: 'd' }, { a: 'b' }, { c: 'd' }] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: arrayRemove(1, 2) };
    const expected = { missing: [] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform to non-array field', () => {
    const baseDoc = { 'non-array': 42 };
    const transform = { 'non-array': arrayRemove(1, 2) };
    const expected = { 'non-array': [] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with non-existing elements', () => {
    const baseDoc = { array: [1, 3] };
    const transform = { array: arrayRemove(2, 4) };
    const expected = { array: [1, 3] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with existing elements', () => {
    const baseDoc = { array: [1, 2, 3, 4] };
    const transform = { array: arrayRemove(1, 3) };
    const expected = { array: [2, 4] };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply local arrayRemove transform with non-primitive elements', () => {
    // Remove nested object values (one existing, one not).
    const baseDoc = { array: [1, { a: 'b' }] };
    const transform = {
      array: arrayRemove({ a: 'b' }, { c: 'd' })
    };
    const expected = { array: [1] };
    verifyTransform(baseDoc, transform, expected);
  });

  function verifyTransform(
    baseData: Dict<unknown>,
    transformData: Dict<unknown> | Array<Dict<unknown>>,
    expectedData: Dict<unknown>
  ): void {
    const document = doc('collection/key', 0, baseData);
    const transforms = Array.isArray(transformData)
      ? transformData
      : [transformData];

    for (const transformData of transforms) {
      const transform = patchMutation('collection/key', transformData);
      mutationApplyToLocalView(
        transform,
        document,
        /* previousMask= */ null,
        timestamp
      );
    }

    const expectedDoc = doc(
      'collection/key',
      0,
      expectedData
    ).setHasLocalMutations();
    expect(document).to.deep.equal(expectedDoc);
  }

  it('can apply server-acked serverTimestamp transform to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const document = doc('collection/key', 0, docData);
    const transform = patchMutation('collection/key', {
      'foo.bar': serverTimestamp()
    });

    const mutationResult = new MutationResult(version(1), [
      {
        timestampValue: {
          seconds: timestamp.seconds,
          nanos: timestamp.nanoseconds
        }
      }
    ]);
    mutationApplyToRemoteDocument(transform, document, mutationResult);

    expect(document).to.deep.equal(
      doc('collection/key', 1, {
        foo: { bar: timestamp.toDate() },
        baz: 'baz-value'
      }).setHasCommittedMutations()
    );
  });

  it('can apply server-acked array transforms to document', () => {
    const docData = { array1: [1, 2], array2: ['a', 'b'] };
    const document = doc('collection/key', 0, docData);
    const transform = setMutation('collection/key', {
      array1: arrayUnion(2, 3),
      array2: arrayRemove('a', 'c')
    });

    // Server just sends null transform results for array operations.
    const mutationResult = new MutationResult(version(1), [null, null]);
    mutationApplyToRemoteDocument(transform, document, mutationResult);

    expect(document).to.deep.equal(
      doc('collection/key', 1, {
        array1: [1, 2, 3],
        array2: ['b']
      }).setHasCommittedMutations()
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
      longPlusLong: increment(1),
      longPlusDouble: increment(2.2),
      doublePlusLong: increment(3),
      doublePlusDouble: increment(4.4),
      longPlusNan: increment(Number.NaN),
      doublePlusNan: increment(Number.NaN),
      longPlusInfinity: increment(Number.POSITIVE_INFINITY),
      doublePlusInfinity: increment(Number.POSITIVE_INFINITY)
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
    const transform = { stringVal: increment(1) };
    const expected = { stringVal: 1 };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply numeric add transform to missing field', () => {
    const baseDoc = {};
    const transform = { missing: increment(1) };
    const expected = { missing: 1 };
    verifyTransform(baseDoc, transform, expected);
  });

  it('can apply numeric add transforms consecutively', () => {
    const baseDoc = { numberVal: 1 };
    const transform1 = { numberVal: increment(2) };
    const transform2 = { numberVal: increment(3) };
    const transform3 = { numberVal: increment(4) };
    const expected = { numberVal: 10 };
    verifyTransform(baseDoc, [transform1, transform2, transform3], expected);
  });

  // PORTING NOTE: The `increment()` overflow/underflow tests from Android/iOS
  // are not applicable to Web since we expose JavaScript's number arithmetic
  // directly.

  it('can apply server-acked numeric add transform to document', () => {
    const docData = { sum: 1 };
    const document = doc('collection/key', 0, docData);
    const transform = setMutation('collection/key', {
      sum: increment(2)
    });

    const mutationResult = new MutationResult(version(1), [
      { integerValue: 3 }
    ]);
    mutationApplyToRemoteDocument(transform, document, mutationResult);

    expect(document).to.deep.equal(
      doc('collection/key', 1, { sum: 3 }).setHasCommittedMutations()
    );
  });

  it('can apply deletes to documents', () => {
    const document = doc('collection/key', 0, { foo: 'bar' });

    const mutation = deleteMutation('collection/key');
    mutationApplyToLocalView(
      mutation,
      document,
      /* previousMask= */ null,
      Timestamp.now()
    );
    expect(document).to.deep.equal(
      deletedDoc('collection/key', 0).setHasLocalMutations()
    );
  });

  it('can apply sets with mutation results', () => {
    const document = doc('collection/key', 0, { foo: 'bar' });

    const docSet = setMutation('collection/key', { foo: 'new-bar' });
    const setResult = mutationResult(4);
    mutationApplyToRemoteDocument(docSet, document, setResult);
    expect(document).to.deep.equal(
      doc('collection/key', 4, { foo: 'new-bar' }).setHasCommittedMutations()
    );
  });

  it('will apply patches with mutation results', () => {
    const document = doc('collection/key', 0, { foo: 'bar' });

    const mutation = patchMutation('collection/key', { foo: 'new-bar' });
    const result = mutationResult(5);
    mutationApplyToRemoteDocument(mutation, document, result);
    expect(document).to.deep.equal(
      doc('collection/key', 5, { foo: 'new-bar' }).setHasCommittedMutations()
    );
  });

  function assertVersionTransitions(
    mutation: Mutation,
    base: MutableDocument,
    mutationResult: MutationResult,
    expected: MutableDocument
  ): void {
    const documentCopy = base.mutableCopy();
    mutationApplyToRemoteDocument(mutation, documentCopy, mutationResult);
    expect(documentCopy).to.deep.equal(expected);
  }

  it('transitions versions correctly', () => {
    const docV3 = doc('collection/key', 3, {});
    const deletedV3 = deletedDoc('collection/key', 3);
    const invalidV3 = invalidDoc('collection/key');

    const set = setMutation('collection/key', {});
    const patch = patchMutation('collection/key', {});
    const deleter = deleteMutation('collection/key');

    const mutationResult = new MutationResult(
      version(7),
      /*transformResults=*/ []
    );
    const docV7Unknown = unknownDoc('collection/key', 7);
    const docV7Deleted = deletedDoc(
      'collection/key',
      7
    ).setHasCommittedMutations();
    const docV7Committed = doc(
      'collection/key',
      7,
      {}
    ).setHasCommittedMutations();

    assertVersionTransitions(set, docV3, mutationResult, docV7Committed);
    assertVersionTransitions(set, deletedV3, mutationResult, docV7Committed);
    assertVersionTransitions(set, invalidV3, mutationResult, docV7Committed);

    assertVersionTransitions(patch, docV3, mutationResult, docV7Committed);
    assertVersionTransitions(patch, deletedV3, mutationResult, docV7Unknown);
    assertVersionTransitions(patch, invalidV3, mutationResult, docV7Unknown);

    assertVersionTransitions(deleter, docV3, mutationResult, docV7Deleted);
    assertVersionTransitions(deleter, deletedV3, mutationResult, docV7Deleted);
    assertVersionTransitions(deleter, invalidV3, mutationResult, docV7Deleted);
  });

  it('extracts null base value for non-transform mutation', () => {
    const data = { foo: 'foo' };
    const baseDoc = doc('collection/key', 0, data);

    const set = setMutation('collection/key', { foo: 'bar' });
    expect(mutationExtractBaseValue(set, baseDoc)).to.be.null;

    const patch = patchMutation('collection/key', { foo: 'bar' });
    expect(mutationExtractBaseValue(patch, baseDoc)).to.be.null;

    const deleter = deleteMutation('collection/key');
    expect(mutationExtractBaseValue(deleter, baseDoc)).to.be.null;
  });

  it('extracts null base value for ServerTimestamp', () => {
    const allValues = { time: 'foo', nested: { time: 'foo' } };
    const baseDoc = doc('collection/key', 0, allValues);

    const allTransforms = {
      time: serverTimestamp(),
      nested: { time: serverTimestamp() }
    };

    // Server timestamps are idempotent and don't have base values.
    const transform = patchMutation('collection/key', allTransforms);
    expect(mutationExtractBaseValue(transform, baseDoc)).to.be.null;
  });

  it('extracts base value for increment', () => {
    const allValues = {
      ignore: 'foo',
      double: 42.0,
      long: 42,
      text: 'foo',
      map: {},
      nested: { ignore: 'foo', double: 42.0, long: 42, text: 'foo', map: {} }
    };
    const baseDoc = doc('collection/key', 0, allValues);

    const allTransforms = {
      double: increment(1),
      long: increment(1),
      text: increment(1),
      map: increment(1),
      missing: increment(1),
      nested: {
        double: increment(1),
        long: increment(1),
        text: increment(1),
        map: increment(1),
        missing: increment(1)
      }
    };
    const transform = patchMutation('collection/key', allTransforms);

    const expectedBaseValue = wrapObject({
      double: 42.0,
      long: 42,
      text: 0,
      map: 0,
      missing: 0,
      nested: { double: 42.0, long: 42, text: 0, map: 0, missing: 0 }
    });
    const actualBaseValue = mutationExtractBaseValue(transform, baseDoc);

    expect(expectedBaseValue.isEqual(actualBaseValue!)).to.be.true;
  });

  it('increment twice', () => {
    const document = doc('collection/key', 0, { sum: 0 });

    const inc = { sum: increment(1) };
    const transform = setMutation('collection/key', inc);

    mutationApplyToLocalView(
      transform,
      document,
      /* previousMask= */ null,
      Timestamp.now()
    );
    mutationApplyToLocalView(
      transform,
      document,
      /* previousMask= */ null,
      Timestamp.now()
    );

    expect(document.isFoundDocument()).to.be.true;
    expect(document.data.field(field('sum'))).to.deep.equal(wrap(2));
  });

  // Mutation Overlay tests

  it('overlay with no mutation', () => {
    const doc1 = doc('collection/key', 1, {
      'foo': 'foo-value',
      'baz': 'baz-value'
    });
    verifyOverlayRoundTrips(doc1);
  });

  it('overlay with mutations fail by preconditions', () => {
    verifyOverlayRoundTrips(
      deletedDoc('collection/key', 1),
      patchMutation('collection/key', { 'foo': 'bar' }),
      patchMutation('collection/key', { 'a': 1 })
    );
  });

  it('overlay with patch on invalid document', () => {
    verifyOverlayRoundTrips(
      MutableDocument.newInvalidDocument(key('collection/key')),
      patchMutation('collection/key', { 'a': 1 })
    );
  });

  it('overlay with one set mutation', () => {
    const doc1 = doc('collection/key', 1, {
      'foo': 'foo-value',
      'baz': 'baz-value'
    });
    verifyOverlayRoundTrips(
      doc1,
      setMutation('collection/key', { 'bar': 'bar-value' })
    );
  });

  it('overlay with one patch mutation', () => {
    const doc1 = doc('collection/key', 1, {
      'foo': { 'bar': 'bar-value' },
      'baz': 'baz-value'
    });
    verifyOverlayRoundTrips(
      doc1,
      patchMutation('collection/key', { 'foo.bar': 'new-bar-value' })
    );
  });

  it('overlay with patch then merge', () => {
    const upsert = mergeMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      [field('foo.bar')]
    );

    verifyOverlayRoundTrips(deletedDoc('collection/key', 1), upsert);
  });

  it('overlay with delete then patch', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const deleteMutation1 = deleteMutation('collection/key');
    const patchMutation1 = patchMutation('collection/key', {
      'foo.bar': 'new-bar-value'
    });

    verifyOverlayRoundTrips(doc1, deleteMutation1, patchMutation1);
  });

  it('overlay with delete then merge', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const deleteMutation1 = deleteMutation('collection/key');
    const mergeMutation1 = mergeMutation(
      'collection/key',
      { 'foo.bar': 'new-bar-value' },
      [field('foo.bar')]
    );

    verifyOverlayRoundTrips(doc1, deleteMutation1, mergeMutation1);
  });

  it('overlay with patch then patch to delete field', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const patch = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': increment(1)
    });
    const patchToDeleteField = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': deleteField()
    });

    verifyOverlayRoundTrips(doc1, patch, patchToDeleteField);
  });

  it('overlay with patch then merge with array union', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const patch = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': increment(1)
    });
    const merge = mergeMutation(
      'collection/key',
      { 'arrays': arrayUnion(1, 2, 3) },
      [field('arrays')]
    );

    verifyOverlayRoundTrips(doc1, patch, merge);
  });

  it('overlay with array union then remove', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const union = mergeMutation(
      'collection/key',
      { 'arrays': arrayUnion(1, 2, 3) },
      []
    );
    const remove = mergeMutation(
      'collection/key',
      { 'foo': 'xxx', 'arrays': arrayRemove(2) },
      [field('foo')]
    );

    verifyOverlayRoundTrips(doc1, union, remove);
  });

  it('overlay with set then increment', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const set = setMutation('collection/key', { 'foo': 2 });
    const update = patchMutation('collection/key', { 'foo': increment(2) });

    verifyOverlayRoundTrips(doc1, set, update);
  });

  it('overlay with set then patch on deleted doc', () => {
    const doc1 = deletedDoc('collection/key', 1);
    const set = setMutation('collection/key', { 'bar': 'bar-value' });
    const patch = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': serverTimestamp()
    });

    verifyOverlayRoundTrips(doc1, set, patch);
  });

  it('overlay with field deletion of nested field', () => {
    const doc1 = doc('collection/key', 1, { 'foo': 1 });
    const patch1 = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': increment(1)
    });
    const patch2 = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': serverTimestamp()
    });
    const patch3 = patchMutation('collection/key', {
      'foo': 'foo-patched-value',
      'bar.baz': deleteField()
    });

    verifyOverlayRoundTrips(doc1, patch1, patch2, patch3);
  });

  it('overlay created from empty set with merge', () => {
    const doc1 = deletedDoc('collection/key', 1);
    const merge = mergeMutation('collection/key', {}, []);
    verifyOverlayRoundTrips(doc1, merge);

    const doc2 = doc('collection/key', 1, { 'foo': 'foo-value' });
    verifyOverlayRoundTrips(doc2, merge);
  });

  // Below tests run on automatically generated mutation list, they are
  // deterministic, but hard to debug when they fail. They will print the
  // failure case, and the best way to debug is recreate the case manually in a
  // separate test.

  it('overlay with mutation with multiple deletes', () => {
    const docs = [
      doc('collection/key', 1, { 'foo': 'foo-value', 'bar.baz': 1 }),
      deletedDoc('collection/key', 1),
      unknownDoc('collection/key', 1)
    ];

    const mutations = [
      setMutation('collection/key', { 'bar': 'bar-value' }),
      deleteMutation('collection/key'),
      deleteMutation('collection/key'),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value',
        'bar.baz': serverTimestamp()
      })
    ];

    const testCases = runPermutationTests(docs, mutations);

    // There are 4! * 3 cases
    expect(testCases).to.equal(72);
  });

  it('overlay by combinations and permutations', () => {
    const docs: MutableDocument[] = [
      doc('collection/key', 1, { 'foo': 'foo-value', 'bar': 1 }),
      deletedDoc('collection/key', 1),
      unknownDoc('collection/key', 1)
    ];

    const mutations: Mutation[] = [
      setMutation('collection/key', { 'bar': 'bar-value' }),
      setMutation('collection/key', { 'bar.rab': 'bar.rab-value' }),
      deleteMutation('collection/key'),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-incr',
        'bar': increment(1)
      }),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-delete',
        'bar': deleteField()
      }),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-st',
        'bar': serverTimestamp()
      }),
      mergeMutation('collection/key', { 'arrays': arrayUnion(1, 2, 3) }, [
        field('arrays')
      ])
    ];

    // Take all possible combinations of the subsets of the mutation list, run each combination for
    // all possible permutation, for all 3 different type of documents.
    let testCases = 0;
    computeCombinations(mutations).forEach(combination => {
      testCases += runPermutationTests(docs, combination);
    });

    // There are (0! + 7*1! + 21*2! + 35*3! + 35*4! + 21*5! + 7*6! + 7!) * 3 = 41100 cases.
    expect(testCases).to.equal(41100);
  }).timeout(10000);

  it('overlay by combinations and permutations for array transforms', () => {
    const docs: MutableDocument[] = [
      doc('collection/key', 1, { 'foo': 'foo-value', 'bar.baz': 1 }),
      deletedDoc('collection/key', 1),
      unknownDoc('collection/key', 1)
    ];

    const mutations: Mutation[] = [
      setMutation('collection/key', { 'bar': 'bar-value' }),
      mergeMutation(
        'collection/key',
        { 'foo': 'xxx', 'arrays': arrayRemove(2) },
        [field('foo')]
      ),
      deleteMutation('collection/key'),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-1',
        'arrays': arrayUnion(4, 5)
      }),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-2',
        'arrays': arrayRemove(5, 6)
      }),
      mergeMutation(
        'collection/key',
        { 'foo': 'yyy', 'arrays': arrayUnion(1, 2, 3, 999) },
        [field('foo')]
      )
    ];

    let testCases = 0;
    computeCombinations(mutations).forEach(combination => {
      testCases += runPermutationTests(docs, combination);
    });

    // There are (0! + 6*1! + 15*2! + 20*3! + 15*4! + 6*5! + 6!) * 3 = 5871 cases.
    expect(testCases).to.equal(5871);
  });

  it('overlay by combinations and permutations for increments', () => {
    const docs: MutableDocument[] = [
      doc('collection/key', 1, { 'foo': 'foo-value', 'bar': 1 }),
      deletedDoc('collection/key', 1),
      unknownDoc('collection/key', 1)
    ];

    const mutations: Mutation[] = [
      setMutation('collection/key', { 'bar': 'bar-value' }),
      mergeMutation(
        'collection/key',
        { 'foo': 'foo-merge', 'bar': increment(2) },
        [field('foo')]
      ),
      deleteMutation('collection/key'),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-1',
        'bar': increment(-1.4)
      }),
      patchMutation('collection/key', {
        'foo': 'foo-patched-value-2',
        'bar': increment(3.3)
      }),
      mergeMutation('collection/key', { 'foo': 'yyy', 'bar': increment(-41) }, [
        field('foo')
      ])
    ];

    let testCases = 0;
    computeCombinations(mutations).forEach(combination => {
      testCases += runPermutationTests(docs, combination);
    });

    // There are (0! + 6*1! + 15*2! + 20*3! + 15*4! + 6*5! + 6!) * 3 = 5871 cases.
    expect(testCases).to.equal(5871);
  });
});
