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
  and as apiAnd,
  eq,
  Field,
  gt,
  gte,
  isNan,
  like,
  lt,
  lte,
  neq,
  notEqAny,
  arrayContainsAny,
  add,
  constant,
  field,
  or as apiOr,
  not as apiNot,
  divide,
  BooleanExpr,
  exists,
  regexMatch,
  eqAny,
  xor as ApiXor,
  arrayContains,
  Expr,
  arrayContainsAll
} from '../../../../lite/pipelines/pipelines';
import { doc as docRef } from '../../../../src';
import { isNull } from '../../../../src/lite-api/expressions';
import { MutableDocument } from '../../../../src/model/document';
import { DOCUMENT_KEY_NAME, FieldPath } from '../../../../src/model/path';
import { newTestFirestore } from '../../../util/api_helpers';
import { doc } from '../../../util/helpers';
import {
  canonifyPipeline,
  constantArray,
  constantMap,
  pipelineEq,
  runPipeline
} from '../../../util/pipelines';
import { and, or, not, xor } from './util';

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
      .where(eq(field('score'), constant(-0.0)));

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
      .where(eq(field('score'), constant(-0)));

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
      .where(eq(field('score'), constant(0.0)));

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
      .where(eq(field('score'), constant(0)));

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
      .where(eq(field('age'), constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('lessThanNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(lt(field('age'), constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('lessThanEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(lte(field('age'), constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('greaterThanEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gte(field('age'), constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('greaterThanNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('age'), constant(NaN)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('notEqualNan', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(neq(field('age'), constant(NaN)));

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
      .where(eqAny(field('name'), [constant(NaN), constant('alice')]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('eqAny_containsNanOnly_isEmpty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eqAny(field('age'), [constant(NaN)]));

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
      .where(notEqAny(field('age'), [constant(NaN), constant(42)]));

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
      .where(notEqAny(field('age'), [constant(NaN)]));

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
      .where(eq(field('foo'), constantArray([NaN])));

    expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  });

  // it('map_withNan', () => {
  //   const doc1 = doc('k/a', 1000, { foo: { a: NaN } });
  //   const doc2 = doc('k/b', 1000, { foo: { a: 42 } });
  //
  //   const pipeline = db.pipeline().database().where(eq(field('foo'), constant({ a: NaN })));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
  // });
});
