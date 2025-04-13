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

describe('database stage', () => {
  it('emptyDatabase_returnsEmptyResults', () => {
    expect(runPipeline(db.pipeline().database(), [])).to.be.empty;
  });

  it('returnsAllDocuments', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(db.pipeline().database(), [doc1, doc2, doc3])
    ).to.deep.equal([doc2, doc1, doc3]);
  });

  it('returnsMultipleCollections', () => {
    const doc1 = doc('a/doc1', 1000, { score: 90, rank: 1 });
    const doc2 = doc('b/doc1', 1000, { score: 50, rank: 3 });
    const doc3 = doc('c/doc1', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(db.pipeline().database(), [doc1, doc2, doc3])
    ).to.deep.equal([doc1, doc2, doc3]);
  });

  it('where_onKey', () => {
    const doc1 = doc('a/1', 1000, { score: 90, rank: 1 });
    const doc2 = doc('b/2', 1000, { score: 50, rank: 3 });
    const doc3 = doc('c/3', 1000, { score: 97, rank: 2 });

    const pipeline = db
      .pipeline()
      .database()
      .where(eq(field(DOCUMENT_KEY_NAME), constant(docRef(db, 'b/2'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });
});
