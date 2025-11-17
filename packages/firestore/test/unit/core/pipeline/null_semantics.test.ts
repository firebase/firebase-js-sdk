/**
 * @license
 * Copyright 2025 Google LLC
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
  equal,
  greaterThan,
  greaterThanOrEqual,
  lessThan,
  lessThanOrEqual,
  notEqual,
  notEqualAny,
  arrayContainsAny,
  constant,
  field,
  BooleanExpression,
  equalAny,
  arrayContains,
  arrayContainsAll,
  isError
} from '../../../../lite/pipelines/pipelines';
import { newTestFirestore } from '../../../util/api_helpers';
import { doc } from '../../../util/helpers';
import {
  constantArray,
  constantMap,
  runPipeline
} from '../../../util/pipelines';

import { and, or, not, xor } from './util';

const db = newTestFirestore();

describe('Null Semantics', () => {
  // ===================================================================
  // Where Tests
  // ===================================================================
  it('where_isNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: {} });
    const doc5 = doc('users/5', 1000, { score: 42 });
    const doc6 = doc('users/6', 1000, { score: NaN });
    const doc7 = doc('users/7', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('score'), null));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc1]);
  });

  it('where_isNotNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: {} });
    const doc5 = doc('users/5', 1000, { score: 42 });
    const doc6 = doc('users/6', 1000, { score: NaN });
    const doc7 = doc('users/7', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(field('score').equal(null)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc2, doc3, doc4, doc5, doc6]);
  });

  it('where_isNullAndIsNotNull_empty', () => {
    const doc1 = doc('users/a', 1000, { score: null });
    const doc2 = doc('users/b', 1000, { score: [null] });
    const doc3 = doc('users/c', 1000, { score: 42 });
    const doc4 = doc('users/d', 1000, { bar: 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(and(field('score').equal(null), not(equal(field('score'), null))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_eq_constantAsNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: NaN });
    const doc4 = doc('users/4', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_eq_fieldAsNull', () => {
    const doc1 = doc('users/1', 1000, { score: null, rank: null });
    const doc2 = doc('users/2', 1000, { score: 42, rank: null });
    const doc3 = doc('users/3', 1000, { score: null, rank: 42 });
    const doc4 = doc('users/4', 1000, { score: null });
    const doc5 = doc('users/5', 1000, { rank: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('score'), field('rank')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_eq_segmentField', () => {
    const doc1 = doc('users/1', 1000, { score: { bonus: null } });
    const doc2 = doc('users/2', 1000, { score: { bonus: 42 } });
    const doc3 = doc('users/3', 1000, { score: { bonus: NaN } });
    const doc4 = doc('users/4', 1000, { score: { 'not-bonus': 42 } });
    const doc5 = doc('users/5', 1000, { score: 'foo-bar' });
    const doc6 = doc('users/6', 1000, { 'not-score': { bonus: 42 } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('score.bonus'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])).to.be
      .empty;
  });

  it('where_eq_singleFieldAndSegmentField', () => {
    const doc1 = doc('users/1', 1000, { score: { bonus: null }, rank: null });
    const doc2 = doc('users/2', 1000, { score: { bonus: 42 }, rank: null });
    const doc3 = doc('users/3', 1000, { score: { bonus: NaN }, rank: null });
    const doc4 = doc('users/4', 1000, {
      score: { 'not-bonus': 42 },
      rank: null
    });
    const doc5 = doc('users/5', 1000, { score: 'foo-bar' });
    const doc6 = doc('users/6', 1000, {
      'not-score': { bonus: 42 },
      rank: null
    });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        and(
          equal(field('score.bonus'), constant(null)),
          equal(field('rank'), constant(null))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])).to.be
      .empty;
  });

  it('where_eq_null_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantArray([null])));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('where_eq_null_other_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [1, null] }); // Note: 1L becomes 1
    const doc4 = doc('k/4', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantArray([1, null]))); // Note: 1L becomes 1

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_eq_null_nan_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantArray([null, NaN])));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('where_eq_null_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: null })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('where_eq_null_other_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: 1, b: null } }); // Note: 1L becomes 1
    const doc4 = doc('k/4', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: 1.0, b: null })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_eq_null_nan_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: null, b: NaN })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('where_eq_map_withNullArray', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: [null] } });
    const doc2 = doc('k/2', 1000, { foo: { a: [1.0, null] } });
    const doc3 = doc('k/3', 1000, { foo: { a: [null, NaN] } });
    const doc4 = doc('k/4', 1000, { foo: { a: [] } });
    const doc5 = doc('k/5', 1000, { foo: { a: [1.0] } });
    const doc6 = doc('k/6', 1000, { foo: { a: [null, 1.0] } });
    const doc7 = doc('k/7', 1000, { foo: { 'not-a': [null] } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: [null] })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])).to
      .be.empty;
  });

  it('where_eq_map_withNullOtherArray', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: [null] } });
    const doc2 = doc('k/2', 1000, { foo: { a: [1.0, null] } });
    const doc3 = doc('k/3', 1000, { foo: { a: [1, null] } }); // Note: 1L becomes 1
    const doc4 = doc('k/4', 1000, { foo: { a: [null, NaN] } });
    const doc5 = doc('k/5', 1000, { foo: { a: [] } });
    const doc6 = doc('k/6', 1000, { foo: { a: [1.0] } });
    const doc7 = doc('k/7', 1000, { foo: { a: [null, 1.0] } });
    const doc8 = doc('k/8', 1000, { foo: { 'not-a': [null] } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: [1.0, null] }))); // Note: 1L becomes 1.0

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.be.empty;
  });

  it('where_eq_map_withNullNanArray', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: [null] } });
    const doc2 = doc('k/2', 1000, { foo: { a: [1.0, null] } });
    const doc3 = doc('k/3', 1000, { foo: { a: [null, NaN] } });
    const doc4 = doc('k/4', 1000, { foo: { a: [] } });
    const doc5 = doc('k/5', 1000, { foo: { a: [1.0] } });
    const doc6 = doc('k/6', 1000, { foo: { a: [null, 1.0] } });
    const doc7 = doc('k/7', 1000, { foo: { 'not-a': [null] } });

    const pipeline = db
      .pipeline()
      .database()
      .where(equal(field('foo'), constantMap({ a: [null, NaN] })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])).to
      .be.empty;
  });

  it('where_compositeCondition_withNull', () => {
    const doc1 = doc('users/a', 1000, { score: 42, rank: null });
    const doc2 = doc('users/b', 1000, { score: 42, rank: 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        and(
          equal(field('score'), constant(42)),
          equal(field('rank'), constant(null))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  });

  it('where_eqAny_nullOnly', () => {
    const doc1 = doc('users/a', 1000, { score: null });
    const doc2 = doc('users/b', 1000, { score: 42 });
    const doc3 = doc('users/c', 1000, { rank: 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(equalAny(field('score'), [constant(null)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  // TODO(pipeline): Support constructing nested array constants
  it.skip('where_eqAny_null_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: null });
    const doc2 = doc('k/2', 1000, { foo: [null] });
    const doc3 = doc('k/3', 1000, { foo: [1.0, null] });
    const doc4 = doc('k/4', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(equalAny(field('foo'), constantArray([[null]])));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_eqAny_partialNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: 25 });
    const doc4 = doc('users/4', 1000, { score: 100 });
    const doc5 = doc('users/5', 1000, { 'not-score': 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(equalAny(field('score'), [constant(null), constant(100)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4]
    );
  });

  it('where_arrayContains_null', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: [null, 42] });
    const doc5 = doc('users/5', 1000, { score: [101, null] });
    const doc6 = doc('users/6', 1000, { score: ['foo', 'bar'] });
    const doc7 = doc('users/7', 1000, { 'not-score': ['foo', 'bar'] });
    const doc8 = doc('users/8', 1000, { 'not-score': ['foo', null] });
    const doc9 = doc('users/9', 1000, { 'not-score': [null, 'foo'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContains(field('score'), constant(null)) as BooleanExpression
      );

    expect(
      runPipeline(pipeline, [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8,
        doc9
      ])
    ).to.be.empty;
  });

  it('where_arrayContainsAny_onlyNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: [null, 42] });
    const doc5 = doc('users/5', 1000, { score: [101, null] });
    const doc6 = doc('users/6', 1000, { score: ['foo', 'bar'] });
    const doc7 = doc('users/7', 1000, { 'not-score': ['foo', 'bar'] });
    const doc8 = doc('users/8', 1000, { 'not-score': ['foo', null] });
    const doc9 = doc('users/9', 1000, { 'not-score': [null, 'foo'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(arrayContainsAny(field('score'), [constant(null)]));

    expect(
      runPipeline(pipeline, [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8,
        doc9
      ])
    ).to.be.empty;
  });

  it('where_arrayContainsAny_partialNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: [null, 42] });
    const doc5 = doc('users/5', 1000, { score: [101, null] });
    const doc6 = doc('users/6', 1000, { score: ['foo', 'bar'] });
    const doc7 = doc('users/7', 1000, { 'not-score': ['foo', 'bar'] });
    const doc8 = doc('users/8', 1000, { 'not-score': ['foo', null] });
    const doc9 = doc('users/9', 1000, { 'not-score': [null, 'foo'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        arrayContainsAny(field('score'), [constant(null), constant('foo')])
      );

    expect(
      runPipeline(pipeline, [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8,
        doc9
      ])
    ).to.deep.equal([doc6]);
  });

  it('where_arrayContainsAll_onlyNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: [null, 42] });
    const doc5 = doc('users/5', 1000, { score: [101, null] });
    const doc6 = doc('users/6', 1000, { score: ['foo', 'bar'] });
    const doc7 = doc('users/7', 1000, { 'not-score': ['foo', 'bar'] });
    const doc8 = doc('users/8', 1000, { 'not-score': ['foo', null] });
    const doc9 = doc('users/9', 1000, { 'not-score': [null, 'foo'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(arrayContainsAny(field('score'), [constant(null)])); // Note: arrayContainsAll not directly available, using Any for now

    expect(
      runPipeline(pipeline, [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8,
        doc9
      ])
    ).to.be.empty; // Assuming arrayContainsAll would be empty
  });

  it('where_arrayContainsAll_partialNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: [] });
    const doc3 = doc('users/3', 1000, { score: [null] });
    const doc4 = doc('users/4', 1000, { score: [null, 42] });
    const doc5 = doc('users/5', 1000, { score: [101, null] });
    const doc6 = doc('users/6', 1000, { score: ['foo', 'bar'] });
    const doc7 = doc('users/7', 1000, { 'not-score': ['foo', 'bar'] });
    const doc8 = doc('users/8', 1000, { 'not-score': ['foo', null] });
    const doc9 = doc('users/9', 1000, { 'not-score': [null, 'foo'] });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(arrayContainsAll(field('score'), [constant(null), constant(42)]));

    expect(
      runPipeline(pipeline, [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8,
        doc9
      ])
    ).to.be.empty;
  });

  it('where_neq_constantAsNull', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: NaN });
    const doc4 = doc('users/4', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('where_neq_fieldAsNull', () => {
    const doc1 = doc('users/1', 1000, { score: null, rank: null });
    const doc2 = doc('users/2', 1000, { score: 42, rank: null });
    const doc3 = doc('users/3', 1000, { score: null, rank: 42 });
    const doc4 = doc('users/4', 1000, { score: null });
    const doc5 = doc('users/5', 1000, { rank: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('score'), field('rank')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_neq_null_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantArray([null])));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('where_neq_null_other_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [1, null] }); // Note: 1L becomes 1
    const doc4 = doc('k/4', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantArray(1, null))); // Note: 1L becomes 1

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  it('where_neq_null_nan_inArray', () => {
    const doc1 = doc('k/1', 1000, { foo: [null] });
    const doc2 = doc('k/2', 1000, { foo: [1.0, null] });
    const doc3 = doc('k/3', 1000, { foo: [null, NaN] });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantArray(null, NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_neq_null_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantMap({ a: null })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('where_neq_null_other_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: 1, b: null } }); // Note: 1L becomes 1
    const doc4 = doc('k/4', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantMap({ a: 1.0, b: null })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  it('where_neq_null_nan_inMap', () => {
    const doc1 = doc('k/1', 1000, { foo: { a: null } });
    const doc2 = doc('k/2', 1000, { foo: { a: 1.0, b: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: NaN } });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqual(field('foo'), constantMap({ a: null, b: NaN })));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_notEqAny_withNull', () => {
    const doc1 = doc('users/a', 1000, { score: null });
    const doc2 = doc('users/b', 1000, { score: 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(notEqualAny(field('score'), [constant(null)]));

    expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  });

  it('where_gt', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: 'hello world' });
    const doc4 = doc('users/4', 1000, { score: NaN });
    const doc5 = doc('users/5', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(greaterThan(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_gte', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: 'hello world' });
    const doc4 = doc('users/4', 1000, { score: NaN });
    const doc5 = doc('users/5', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(greaterThanOrEqual(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_lt', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: 'hello world' });
    const doc4 = doc('users/4', 1000, { score: NaN });
    const doc5 = doc('users/5', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(lessThan(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_lte', () => {
    const doc1 = doc('users/1', 1000, { score: null });
    const doc2 = doc('users/2', 1000, { score: 42 });
    const doc3 = doc('users/3', 1000, { score: 'hello world' });
    const doc4 = doc('users/4', 1000, { score: NaN });
    const doc5 = doc('users/5', 1000, { 'not-score': 42 });

    const pipeline = db
      .pipeline()
      .database()
      .where(lessThanOrEqual(field('score'), constant(null)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('where_and', () => {
    const doc1 = doc('k/1', 1000, { a: true, b: null });
    const doc2 = doc('k/2', 1000, { a: false, b: null });
    const doc3 = doc('k/3', 1000, { a: null, b: null });
    const doc4 = doc('k/4', 1000, { a: true, b: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        and(
          field('a') as unknown as BooleanExpression,
          field('b') as unknown as BooleanExpression
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc4
    ]);
  });

  it('where_isNull_and', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        equal(
          and(
            field('a') as unknown as BooleanExpression,
            field('b') as unknown as BooleanExpression
          ),
          null
        )
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc1, doc3, doc6]);
  });

  it('where_isError_and', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(isError(and(field('a'), field('b')))); // Placeholder

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc2, doc5, doc8]);
  });

  it('where_or', () => {
    const doc1 = doc('k/1', 1000, { a: true, b: null });
    const doc2 = doc('k/2', 1000, { a: false, b: null });
    const doc3 = doc('k/3', 1000, { a: null, b: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(or(field('a'), field('b')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('where_isNull_or', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(or(field('a'), field('b')).equal(null));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc1, doc4, doc7]);
  });

  it('where_isError_or', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(isError(or(field('a'), field('b')))); // Placeholder

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc2, doc5, doc8]);
  });

  it('where_xor', () => {
    const doc1 = doc('k/1', 1000, { a: true, b: null });
    const doc2 = doc('k/2', 1000, { a: false, b: null });
    const doc3 = doc('k/3', 1000, { a: null, b: null });
    const doc4 = doc('k/4', 1000, { a: true, b: false });

    const pipeline = db
      .pipeline()
      .database()
      .where(xor(field('a'), field('b')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc4
    ]);
  });

  it('where_isNull_xor', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(xor(field('a'), field('b')).equal(null));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc1, doc3, doc4, doc6, doc7]);
  });

  it('where_isError_xor', () => {
    const doc1 = doc('k/1', 1000, { a: null, b: null });
    const doc2 = doc('k/2', 1000, { a: null });
    const doc3 = doc('k/3', 1000, { a: null, b: true });
    const doc4 = doc('k/4', 1000, { a: null, b: false });
    const doc5 = doc('k/5', 1000, { b: null });
    const doc6 = doc('k/6', 1000, { a: true, b: null });
    const doc7 = doc('k/7', 1000, { a: false, b: null });
    const doc8 = doc('k/8', 1000, { 'not-a': true, 'not-b': true });

    const pipeline = db
      .pipeline()
      .database()
      .where(isError(xor(field('a'), field('b'))));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc2, doc5, doc8]);
  });

  it('where_not', () => {
    const doc1 = doc('k/1', 1000, { a: true });
    const doc2 = doc('k/2', 1000, { a: false });
    const doc3 = doc('k/3', 1000, { a: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(equal(field('a'), true)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });

  it('where_isNull_not', () => {
    const doc1 = doc('k/1', 1000, { a: true });
    const doc2 = doc('k/2', 1000, { a: false });
    const doc3 = doc('k/3', 1000, { a: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(field('a').equal(true)).equal(null));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('where_isError_not', () => {
    const doc1 = doc('k/1', 1000, { a: true });
    const doc2 = doc('k/2', 1000, { a: false });
    const doc3 = doc('k/3', 1000, { a: null });

    const pipeline = db
      .pipeline()
      .database()
      .where(isError(not(field('a').equal(true))));

    expect(runPipeline(pipeline, [])).to.deep.equal([]);
  });

  // ===================================================================
  // Sort Tests
  // ===================================================================
  it('sort_null_inArray_ascending', () => {
    const doc0 = doc('k/0', 1000, { 'not-foo': [] });
    const doc1 = doc('k/1', 1000, { foo: [] });
    const doc2 = doc('k/2', 1000, { foo: [null] });
    const doc3 = doc('k/3', 1000, { foo: [null, null] });
    const doc4 = doc('k/4', 1000, { foo: [null, 1] });
    const doc5 = doc('k/5', 1000, { foo: [null, 2] });
    const doc6 = doc('k/6', 1000, { foo: [1, null] });
    const doc7 = doc('k/7', 1000, { foo: [2, null] });
    const doc8 = doc('k/8', 1000, { foo: [2, 1] });

    const pipeline = db.pipeline().database().sort(field('foo').ascending());

    expect(
      runPipeline(pipeline, [
        doc0,
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8
      ])
    ).to.have.ordered.members([
      doc0,
      doc1,
      doc2,
      doc3,
      doc4,
      doc5,
      doc6,
      doc7,
      doc8
    ]);
  });

  it('sort_null_inArray_descending', () => {
    const doc0 = doc('k/0', 1000, { 'not-foo': [] });
    const doc1 = doc('k/1', 1000, { foo: [] });
    const doc2 = doc('k/2', 1000, { foo: [null] });
    const doc3 = doc('k/3', 1000, { foo: [null, null] });
    const doc4 = doc('k/4', 1000, { foo: [null, 1] });
    const doc5 = doc('k/5', 1000, { foo: [null, 2] });
    const doc6 = doc('k/6', 1000, { foo: [1, null] });
    const doc7 = doc('k/7', 1000, { foo: [2, null] });
    const doc8 = doc('k/8', 1000, { foo: [2, 1] });

    const pipeline = db.pipeline().database().sort(field('foo').descending());

    expect(
      runPipeline(pipeline, [
        doc0,
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8
      ])
    ).to.have.ordered.members([
      doc8,
      doc7,
      doc6,
      doc5,
      doc4,
      doc3,
      doc2,
      doc1,
      doc0
    ]);
  });

  it('sort_null_inMap_ascending', () => {
    const doc0 = doc('k/0', 1000, { 'not-foo': {} });
    const doc1 = doc('k/1', 1000, { foo: {} });
    const doc2 = doc('k/2', 1000, { foo: { a: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: null } });
    const doc4 = doc('k/4', 1000, { foo: { a: null, b: 1 } });
    const doc5 = doc('k/5', 1000, { foo: { a: null, b: 2 } });
    const doc6 = doc('k/6', 1000, { foo: { a: 1, b: null } });
    const doc7 = doc('k/7', 1000, { foo: { a: 2, b: null } });
    const doc8 = doc('k/8', 1000, { foo: { a: 2, b: 1 } });

    const pipeline = db.pipeline().database().sort(field('foo').ascending());

    expect(
      runPipeline(pipeline, [
        doc0,
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8
      ])
    ).to.have.ordered.members([
      doc0,
      doc1,
      doc2,
      doc3,
      doc4,
      doc5,
      doc6,
      doc7,
      doc8
    ]);
  });

  it('sort_null_inMap_descending', () => {
    const doc0 = doc('k/0', 1000, { 'not-foo': {} });
    const doc1 = doc('k/1', 1000, { foo: {} });
    const doc2 = doc('k/2', 1000, { foo: { a: null } });
    const doc3 = doc('k/3', 1000, { foo: { a: null, b: null } });
    const doc4 = doc('k/4', 1000, { foo: { a: null, b: 1 } });
    const doc5 = doc('k/5', 1000, { foo: { a: null, b: 2 } });
    const doc6 = doc('k/6', 1000, { foo: { a: 1, b: null } });
    const doc7 = doc('k/7', 1000, { foo: { a: 2, b: null } });
    const doc8 = doc('k/8', 1000, { foo: { a: 2, b: 1 } });

    const pipeline = db.pipeline().database().sort(field('foo').descending());

    expect(
      runPipeline(pipeline, [
        doc0,
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6,
        doc7,
        doc8
      ])
    ).to.have.ordered.members([
      doc8,
      doc7,
      doc6,
      doc5,
      doc4,
      doc3,
      doc2,
      doc1,
      doc0
    ]);
  });
});
