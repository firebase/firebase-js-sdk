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
  arrayContainsAny,
  constant,
  field,
  BooleanExpression as BooleanExpr,
  arrayContains
} from '../../../../lite/pipelines/pipelines';
import { newTestFirestore } from '../../../util/api_helpers';
import { doc } from '../../../util/helpers';
import { constantArray, runPipeline } from '../../../util/pipelines';

const db = newTestFirestore();

describe('Number Semantics', () => {
  it('zero_negativeDoubleZero', () => {
    const doc1 = doc('users/a', 1000, { score: 0 });
    const doc2 = doc('users/b', 1000, { score: -0 });
    const doc3 = doc('users/c', 1000, { score: 0.0 });
    const doc4 = doc('users/d', 1000, { score: -0.0 });
    const doc5 = doc('users/e', 1000, { score: 1 });

    const pipeline = db
      .pipeline()
      .database()
      .where(field('score').equal(constant(-0.0)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('zero_negativeIntegerZero', () => {
    const doc1 = doc('users/a', 1000, { score: 0 });
    const doc2 = doc('users/b', 1000, { score: -0 });
    const doc3 = doc('users/c', 1000, { score: 0.0 });
    const doc4 = doc('users/d', 1000, { score: -0.0 });
    const doc5 = doc('users/e', 1000, { score: 1 });

    const pipeline = db
      .pipeline()
      .database()
      .where(field('score').equal(constant(-0)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('zero_positiveDoubleZero', () => {
    const doc1 = doc('users/a', 1000, { score: 0 });
    const doc2 = doc('users/b', 1000, { score: -0 });
    const doc3 = doc('users/c', 1000, { score: 0.0 });
    const doc4 = doc('users/d', 1000, { score: -0.0 });
    const doc5 = doc('users/e', 1000, { score: 1 });

    const pipeline = db
      .pipeline()
      .database()
      .where(field('score').equal(constant(0.0)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('zero_positiveIntegerZero', () => {
    const doc1 = doc('users/a', 1000, { score: 0 });
    const doc2 = doc('users/b', 1000, { score: -0 });
    const doc3 = doc('users/c', 1000, { score: 0.0 });
    const doc4 = doc('users/d', 1000, { score: -0.0 });
    const doc5 = doc('users/e', 1000, { score: 1 });

    const pipeline = db
      .pipeline()
      .database()
      .where(field('score').equal(constant(0)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('equalNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').equal(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('lessThanNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').lessThan(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('lessThanEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').lessThanOrEqual(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('greaterThanEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').greaterThanOrEqual(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('greaterThanNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').greaterThan(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('notEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').notEqual(constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc2,
      doc3
    ]);
  });

  it('eqAny_containsNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('name').equalAny([constant(NaN), constant('alice')]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('eqAny_containsNanOnly_isEmpty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').equalAny([constant(NaN)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('arrayContains_nanOnly_isEmpty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(arrayContains(field('age'), constant(NaN)) as BooleanExpr);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('arrayContainsAny_withNaN', () => {
    const doc1 = doc('users/a', 1000, { field: [NaN] });
    const doc2 = doc('users/b', 1000, { field: [NaN, 42] });
    const doc3 = doc('users/c', 1000, { field: ['foo', 42] });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        arrayContainsAny(field('field'), [constant(NaN), constant('foo')])
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('notEqAny_containsNan', () => {
    const doc1 = doc('users/a', 1000, { age: 42 });
    const doc2 = doc('users/b', 1000, { age: NaN });
    const doc3 = doc('users/c', 1000, { age: 25 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').notEqualAny([constant(NaN), constant(42)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('notEqAny_containsNanOnly_isEmpty', () => {
    const doc1 = doc('users/a', 1000, { age: 42 });
    const doc2 = doc('users/b', 1000, { age: NaN });
    const doc3 = doc('users/c', 1000, { age: 25 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(field('age').notEqualAny([constant(NaN)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc2,
      doc3
    ]);
  });

  it('array_withNan', () => {
    const doc1 = doc('k/a', 1000, { foo: [NaN] });
    const doc2 = doc('k/b', 1000, { foo: [42] });

    const pipeline = db
      .pipeline()
      .database()
      .where(field('foo').equal(constantArray([NaN])));

    expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  });

  // it('map_withNan', () => {
  //   const doc1 = doc('k/a', 1000, { foo: { a: NaN } });
  //   const doc2 = doc('k/b', 1000, { foo: { a: 42 } });
  //
  //   const pipeline = db.pipeline().database().where(equal(field('foo'), constant({ a: NaN })));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  // });
});
