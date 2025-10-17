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
  Field,
  isNan,
  like,
  arrayContainsAny,
  add,
  constant,
  field,
  or as apiOr,
  not as apiNot,
  divide,
  BooleanExpression as BooleanExpr,
  exists,
  regexMatch,
  xor as ApiXor,
  arrayContains,
  Expression as Expr,
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

describe('Unicode Tests', () => {
  it('basicUnicode', () => {
    const doc1 = doc('🐵/Łukasiewicz', 1000, { Ł: 'Jan Łukasiewicz' });
    const doc2 = doc('🐵/Sierpiński', 1000, { Ł: 'Wacław Sierpiński' });
    const doc3 = doc('🐵/iwasawa', 1000, { Ł: '岩澤' });

    const pipeline = db
      .pipeline()
      .collection('/🐵')
      .sort(field('Ł').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc2,
      doc3
    ]);
  });

  // TODO(pipeline): SDK's surrogates ordering has always been incompatible with
  // backends, which comes from ICU4J. We need to replicate the semantics of that.
  // Skipping below tests until then.
  it('unicodeSurrogates', () => {
    const doc1 = doc('users/a', 1000, { str: '🄟' });
    const doc2 = doc('users/b', 1000, { str: 'Ｐ' });
    const doc3 = doc('users/c', 1000, { str: '︒' });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        and(
          field('str').lessThanOrEqual(constant('🄟')),
          field('str').greaterThanOrEqual(constant('Ｐ'))
        )
      )
      .sort(field('str').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1
    ]);
  });

  it('unicodeSurrogatesInArray', () => {
    const doc1 = doc('users/a', 1000, { foo: ['🄟'] });
    const doc2 = doc('users/b', 1000, { foo: ['Ｐ'] });
    const doc3 = doc('users/c', 1000, { foo: ['︒'] });

    const pipeline = db.pipeline().database().sort(field('foo').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc2,
      doc1
    ]);
  });

  it('unicodeSurrogatesInMapKeys', () => {
    const doc1 = doc('users/a', 1000, { map: { '︒': true, z: true } });
    const doc2 = doc('users/b', 1000, { map: { '🄟': true, '︒': true } });
    const doc3 = doc('users/c', 1000, { map: { 'Ｐ': true, '︒': true } });

    const pipeline = db.pipeline().database().sort(field('map').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3,
      doc2
    ]);
  });

  it('unicodeSurrogatesInMapValues', () => {
    const doc1 = doc('users/a', 1000, { map: { foo: '︒' } });
    const doc2 = doc('users/b', 1000, { map: { foo: '🄟' } });
    const doc3 = doc('users/c', 1000, { map: { foo: 'Ｐ' } });

    const pipeline = db.pipeline().database().sort(field('map').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3,
      doc2
    ]);
  });
});
