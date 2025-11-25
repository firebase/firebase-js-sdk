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
  constant,
  field,
  or as apiOr,
  divide,
  xor as ApiXor,
  not
} from '../../../../lite/pipelines/pipelines';
import { newTestFirestore } from '../../../util/api_helpers';
import { doc } from '../../../util/helpers';
import { runPipeline } from '../../../util/pipelines';

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
        apiOr(
          field('a').equal(true),
          field('b').equal(true),
          field('c').equal(true)
        )
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
        apiAnd(
          field('a').equal(true),
          field('b').equal(true),
          field('c').equal(true)
        )
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
          field('a').asBoolean(),
          field('b').asBoolean(),
          field('c').asBoolean()
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
      .where(not(field('a').asBoolean()));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('where_errorProducingFunction_returnsEmpty', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: true });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: '42' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 0 });

    const pipeline = db
      .pipeline()
      .database()
      .where(divide(constant('100'), constant('50')).equal(constant(2)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });
});
