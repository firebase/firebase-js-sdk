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

describe('Sort Tests', () => {
  it('empty_ascending', () => {
    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [])).to.be.empty;
  });

  it('empty_descending', () => {
    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').descending());

    expect(runPipeline(pipeline, [])).to.be.empty;
  });

  it('singleResult_ascending', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('singleResult_ascending_explicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('singleResult_ascending_explicitNotExists_empty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('age'))))
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1])).to.be.empty;
  });

  it('singleResult_ascending_implicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('age'), constant(10)))
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('singleResult_descending', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').descending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('singleResult_descending_explicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .sort(field('age').descending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('singleResult_descending_implicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('age'), constant(10)))
      .sort(field('age').descending());

    expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
  });

  it('multipleResults_ambiguousOrder', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_ambiguousOrder_explicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .sort(field('age').descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_ambiguousOrder_implicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('age'), constant(0)))
      .sort(field('age').descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_fullOrder', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').descending(), field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_fullOrder_explicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .where(exists(field('name')))
      .sort(field('age').descending(), field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_fullOrder_explicitNotExists_empty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob' });
    const doc3 = doc('users/c', 1000, { age: 100 });
    const doc4 = doc('users/d', 1000, { other_name: 'diane' });
    const doc5 = doc('users/e', 1000, { other_age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('age'))))
      .where(not(exists(field('name'))))
      .sort(field('age').descending(), field('name').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.contain(
      doc4
    );
    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.contain(
      doc5
    );
    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.lengthOf(2);
  });

  it('multipleResults_fullOrder_implicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('age'), field('age')))
      .where(regexMatch(field('name'), constant('.*')))
      .sort(field('age').descending(), field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_fullOrder_partialExplicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('name')))
      .sort(field('age').descending(), field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('multipleResults_fullOrder_partialExplicitNotExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('name'))))
      .sort(field('age').descending(), field('name').descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc2]);
  });

  it('multipleResults_fullOrder_partialExplicitNotExists_sortOnNonExistFieldFirst', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('name'))))
      .sort(field('name').descending(), field('age').descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc2]);
  });

  it('multipleResults_fullOrder_partialImplicitExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(regexMatch(field('name'), constant('.*')))
      .sort(field('age').descending(), field('name').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc1, doc2, doc4, doc5]);
  });

  it('missingField_allFields', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('not_age').descending());

    // Any order is acceptable.
    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.deep.members([doc1, doc2, doc3, doc4, doc5]);
  });

  it('missingField_withExist_empty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('not_age')))
      .sort(field('not_age').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('missingField_partialFields', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').ascending());

    // Any order is acceptable.
    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.deep.members([doc5, doc1, doc3, doc2, doc4]);
  });

  it('missingField_partialFields_withExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc5, doc1, doc3]);
  });

  it('missingField_partialFields_withNotExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('age'))))
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc2, doc4]);
  });

  it('limit_afterSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').ascending())
      .limit(2);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('limit_afterSort_withExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field('age')))
      .sort(field('age').ascending())
      .limit(2);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc5, doc2]);
  });

  it('limit_afterSort_withNotExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(exists(field('age'))))
      .sort(field('age').ascending())
      .limit(2);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('limit_zero_afterSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .sort(field('age').ascending())
      .limit(0);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('limit_beforeSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .limit(1)
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.lengthOf(1);
  });

  it('limit_beforeSort_withExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(exists(field('age')))
      .limit(1)
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.lengthOf(1);
  });

  it('limit_beforeSort_withNotExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric' });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(not(exists(field('age'))))
      .limit(1)
      .sort(field('age').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.lengthOf(1);
  });

  it('limit_beforeNotExistFilter', () => {
    const doc1 = doc('users/a', 1000, { age: 75.5 });
    const doc2 = doc('users/b', 1000, { age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric' });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .limit(2)
      .where(not(exists(field('age'))))
      .sort(field('age').ascending());

    // The right sematics would accept [], [doc4], [doc5], [doc4, doc5] [doc5, doc4].
    // We only test the first possibility here because of the implied order limit
    // is applied for offline evaluation.
    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('limit_zero_beforeSort', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .limit(0)
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.be.empty;
  });

  it('sort_expression', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 30 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 50 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 40 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 20 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(add(field('age'), constant(10)).descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc4, doc2, doc5, doc1]);
  });

  it('sort_expression_withExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });
    const doc2 = doc('users/b', 1000, { age: 30 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 50 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 20 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(exists(field('age')))
      .sort(add(field('age'), constant(10)).descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc3, doc2, doc5, doc1]);
  });

  it('sort_expression_withNotExist', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });
    const doc2 = doc('users/b', 1000, { age: 30 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 50 });
    const doc4 = doc('users/d', 1000, { name: 'diane' });
    const doc5 = doc('users/e', 1000, { name: 'eric' });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(not(exists(field('age'))))
      .sort(add(field('age'), constant(10)).descending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
    ).to.have.ordered.members([doc4, doc5]);
  });

  it('sortOnPathAndOtherField_onDifferentStages', () => {
    const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
    const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
    const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field(DOCUMENT_KEY_NAME)))
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('sortOnOtherFieldAndPath_onDifferentStages', () => {
    const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
    const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
    const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field(DOCUMENT_KEY_NAME)))
      .sort(field('age').ascending())
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc2,
      doc3
    ]);
  });

  it('sortOnKeyAndOtherField_onMultipleStages', () => {
    const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
    const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
    const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field(DOCUMENT_KEY_NAME)))
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .sort(field('age').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('sortOnOtherFieldAndKey_onMultipleStages', () => {
    const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
    const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
    const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(exists(field(DOCUMENT_KEY_NAME)))
      .sort(field('age').ascending())
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc2,
      doc3
    ]);
  });
});
