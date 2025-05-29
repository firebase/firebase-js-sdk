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

describe('Error Handling', () => {
  it('where_partialError_or', () => {
    const doc1 = doc('k/1', 1000, { a: 'true', b: true, c: false });
    const doc2 = doc('k/2', 1000, { a: true, b: 'true', c: false });
    const doc3 = doc('k/3', 1000, { a: true, b: false, c: 'true' });
    const doc4 = doc('k/4', 1000, { a: 'true', b: 'true', c: true });
    const doc5 = doc('k/5', 1000, { a: 'true', b: true, c: 'true' });
    const doc6 = doc('k/6', 1000, { a: true, b: 'true', c: 'true' });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        apiOr(eq(field('a'), true), eq(field('b'), true), eq(field('c'), true))
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
    ).to.deep.equal([doc1, doc2, doc3, doc4, doc5, doc6]);
  });

  it('where_partialError_and', () => {
    const doc1 = doc('k/1', 1000, { a: 'true', b: true, c: false });
    const doc2 = doc('k/2', 1000, { a: true, b: 'true', c: false });
    const doc3 = doc('k/3', 1000, { a: true, b: false, c: 'true' });
    const doc4 = doc('k/4', 1000, { a: 'true', b: 'true', c: true });
    const doc5 = doc('k/5', 1000, { a: 'true', b: true, c: 'true' });
    const doc6 = doc('k/6', 1000, { a: true, b: 'true', c: 'true' });
    const doc7 = doc('k/7', 1000, { a: true, b: true, c: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        apiAnd(eq(field('a'), true), eq(field('b'), true), eq(field('c'), true))
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc7]);
  });

  it('where_partialError_xor', () => {
    const doc1 = doc('k/1', 1000, { a: 'true', b: true, c: false });
    const doc2 = doc('k/2', 1000, { a: true, b: 'true', c: false });
    const doc3 = doc('k/3', 1000, { a: true, b: false, c: 'true' });
    const doc4 = doc('k/4', 1000, { a: 'true', b: 'true', c: true });
    const doc5 = doc('k/5', 1000, { a: 'true', b: true, c: 'true' });
    const doc6 = doc('k/6', 1000, { a: true, b: 'true', c: 'true' });
    const doc7 = doc('k/7', 1000, { a: true, b: true, c: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        ApiXor(
          field('a') as unknown as BooleanExpr,
          field('b') as unknown as BooleanExpr,
          field('c') as unknown as BooleanExpr
        )
      );

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc7]);
  });

  it('where_not_error', () => {
    const doc1 = doc('k/1', 1000, { a: false });
    const doc2 = doc('k/2', 1000, { a: 'true' });
    const doc3 = doc('k/3', 1000, { b: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(new BooleanExpr('not', [field('a')]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('where_errorProducingFunction_returnsEmpty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: true });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: '42' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 0 });

    const pipeline = db
      .pipeline()
      .database()
      .where(eq(divide(constant('100'), constant('50')), constant(2)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });
});
