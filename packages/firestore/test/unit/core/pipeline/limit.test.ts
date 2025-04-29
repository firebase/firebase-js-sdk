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

describe('Limit Queries', () => {
  it('limit_zero', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(0);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('limit_zero_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(0).limit(0).limit(0);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
  });

  it('limit_one', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(1);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(1);
  });

  it('limit_one_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(1).limit(1).limit(1);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(1);
  });

  it('limit_two', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(2);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(2);
  });

  it('limit_two_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(2).limit(2).limit(2);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(2);
  });

  it('limit_three', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(3);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(3);
  });

  it('limit_three_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(3).limit(3).limit(3);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(3);
  });

  it('limit_four', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(4);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });

  it('limit_four_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(4).limit(4).limit(4);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });

  it('limit_five', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(5);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });

  it('limit_five_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db.pipeline().collection('/k').limit(5).limit(5).limit(5);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });

  it('limit_max', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db
      .pipeline()
      .collection('/k')
      .limit(Number.MAX_SAFE_INTEGER);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });

  it('limit_max_duplicated', () => {
    const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
    const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
    const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
    const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

    const pipeline = db
      .pipeline()
      .collection('/k')
      .limit(Number.MAX_SAFE_INTEGER)
      .limit(Number.MAX_SAFE_INTEGER)
      .limit(Number.MAX_SAFE_INTEGER);

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(4);
  });
});
