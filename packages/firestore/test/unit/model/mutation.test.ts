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
import { Timestamp } from '../../../src/api/timestamp';
import { Document, MaybeDocument } from '../../../src/model/document';
import {
  ServerTimestampValue,
  TimestampValue
} from '../../../src/model/field_value';
import {
  Mutation,
  MutationResult,
  Precondition
} from '../../../src/model/mutation';
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
  version,
  wrapObject
} from '../../util/helpers';
import { addEqualityMatcher } from '../../util/equality_matcher';

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

  it('can apply local transforms to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', ['foo.bar']);

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

  it('can apply server-acked transforms to documents', () => {
    const docData = { foo: { bar: 'bar-value' }, baz: 'baz-value' };

    const baseDoc = doc('collection/key', 0, docData);
    const transform = transformMutation('collection/key', ['foo.bar']);

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
        0,
        { foo: { bar: timestamp.toDate() }, baz: 'baz-value' },
        { hasLocalMutations: false }
      )
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
      doc('collection/key', 0, { foo: 'new-bar' }, { hasLocalMutations: false })
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
        0,
        { foo: 'new-bar' },
        {
          hasLocalMutations: false
        }
      )
    );
  });

  function assertVersionTransitions(
    mutation: Mutation,
    base: MaybeDocument | null,
    mutationResult: MutationResult,
    expected: MaybeDocument | null
  ) {
    const actual = mutation.applyToRemoteDocument(base, mutationResult);
    expect(actual).to.deep.equal(expected);
  }

  it('transitions versions correctly', () => {
    const docV0 = doc('collection/key', 0, {});
    const deletedV0 = deletedDoc('collection/key', 0);

    const docV3 = doc('collection/key', 3, {});
    const deletedV3 = deletedDoc('collection/key', 3);

    const set = setMutation('collection/key', {});
    const patch = patchMutation('collection/key', {});
    const transform = transformMutation('collection/key', []);
    const deleter = deleteMutation('collection/key');

    const mutationResult = new MutationResult(
      version(7),
      /*transformResults=*/ null
    );
    const transformResult = new MutationResult(version(7), []);

    assertVersionTransitions(set, docV3, mutationResult, docV3);
    assertVersionTransitions(set, deletedV3, mutationResult, docV0);
    assertVersionTransitions(set, null, mutationResult, docV0);

    assertVersionTransitions(patch, docV3, mutationResult, docV3);
    assertVersionTransitions(patch, deletedV3, mutationResult, deletedV3);
    assertVersionTransitions(patch, null, mutationResult, null);

    assertVersionTransitions(transform, docV3, transformResult, docV3);
    assertVersionTransitions(transform, deletedV3, transformResult, deletedV3);
    assertVersionTransitions(transform, null, transformResult, null);

    assertVersionTransitions(deleter, docV3, mutationResult, deletedV0);
    assertVersionTransitions(deleter, deletedV3, mutationResult, deletedV0);
    assertVersionTransitions(deleter, null, mutationResult, deletedV0);
  });
});
