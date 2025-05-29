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

describe('Where Stage', () => {
  it('emptyDatabase_returnsNoResults', () => {
    expect(
      runPipeline(
        db
          .pipeline()
          .database()
          .where(gte(field('age'), constant(10))),
        []
      )
    ).to.be.empty;
  });

  it('duplicateConditions', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .database()
      .where(
        and(gte(field('age'), constant(10)), gte(field('age'), constant(20)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3]
    );
  });

  it('logicalEquivalentCondition_equal', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline1 = db
      .pipeline()
      .database()
      .where(eq(field('age'), constant(25)));
    const pipeline2 = db
      .pipeline()
      .database()
      .where(eq(constant(25), field('age')));

    const result1 = runPipeline(pipeline1, [doc1, doc2, doc3]);
    const result2 = runPipeline(pipeline2, [doc1, doc2, doc3]);

    expect(result1).to.deep.equal([doc2]);
    expect(result1).to.deep.equal(result2);
  });

  it('logicalEquivalentCondition_and', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline1 = db
      .pipeline()
      .database()
      .where(
        and(gt(field('age'), constant(10)), lt(field('age'), constant(70)))
      );
    const pipeline2 = db
      .pipeline()
      .database()
      .where(
        and(lt(field('age'), constant(70)), gt(field('age'), constant(10)))
      );

    const result1 = runPipeline(pipeline1, [doc1, doc2, doc3]);
    const result2 = runPipeline(pipeline2, [doc1, doc2, doc3]);

    expect(result1).to.deep.equal([doc2]);
    expect(result1).to.deep.equal(result2);
  });

  it('logicalEquivalentCondition_or', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline1 = db
      .pipeline()
      .database()
      .where(
        or(lt(field('age'), constant(10)), gt(field('age'), constant(80)))
      );
    const pipeline2 = db
      .pipeline()
      .database()
      .where(
        or(gt(field('age'), constant(80)), lt(field('age'), constant(10)))
      );

    const result1 = runPipeline(pipeline1, [doc1, doc2, doc3]);
    const result2 = runPipeline(pipeline2, [doc1, doc2, doc3]);

    expect(result1).to.deep.equal([doc3]);
    expect(result1).to.deep.equal(result2);
  });

  it('logicalEquivalentCondition_in', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

    const pipeline1 = db
      .pipeline()
      .database()
      .where(
        eqAny(field('name'), [
          constant('alice'),
          constant('matthew'),
          constant('joe')
        ])
      );
    const pipeline2 = db
      .pipeline()
      .database()
      .where(
        arrayContainsAny(constantArray(['alice', 'matthew', 'joe']), [
          field('name')
        ])
      );

    const result1 = runPipeline(pipeline1, [doc1, doc2, doc3]);
    const result2 = runPipeline(pipeline2, [doc1, doc2, doc3]);

    expect(result1).to.deep.equal([doc1]);
    expect(result1).to.deep.equal(result2);
  });

  it('repeatedStages', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
    const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
    const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

    const pipeline = db
      .pipeline()
      .database()
      .where(gte(field('age'), constant(10)))
      .where(gte(field('age'), constant(20)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3]
    );
  });

  it('composite_equalities', () => {
    const doc1 = doc('users/a', 1000, { height: 60, age: 75 });
    const doc2 = doc('users/b', 1000, { height: 55, age: 50 });
    const doc3 = doc('users/c', 1000, { height: 55.0, age: 75 });
    const doc4 = doc('users/d', 1000, { height: 50, age: 41 });
    const doc5 = doc('users/e', 1000, { height: 80, age: 75 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('age'), constant(75)))
      .where(eq(field('height'), constant(55)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3]
    );
  });

  it('composite_inequalities', () => {
    const doc1 = doc('users/a', 1000, { height: 60, age: 75 });
    const doc2 = doc('users/b', 1000, { height: 55, age: 50 });
    const doc3 = doc('users/c', 1000, { height: 55.0, age: 75 });
    const doc4 = doc('users/d', 1000, { height: 50, age: 41 });
    const doc5 = doc('users/e', 1000, { height: 80, age: 75 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('age'), constant(50)))
      .where(lt(field('height'), constant(75)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc3]
    );
  });

  it('composite_nonSeekable', () => {
    const doc1 = doc('users/a', 1000, { first: 'alice', last: 'smith' });
    const doc2 = doc('users/b', 1000, { first: 'bob', last: 'smith' });
    const doc3 = doc('users/c', 1000, { first: 'charlie', last: 'baker' });
    const doc4 = doc('users/d', 1000, { first: 'diane', last: 'miller' });
    const doc5 = doc('users/e', 1000, { first: 'eric', last: 'davis' });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(like(field('first'), constant('%a%')))
      .where(like(field('last'), constant('%er')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4]
    );
  });

  it('composite_mixed', () => {
    const doc1 = doc('users/a', 1000, {
      first: 'alice',
      last: 'smith',
      age: 75,
      height: 40
    });
    const doc2 = doc('users/b', 1000, {
      first: 'bob',
      last: 'smith',
      age: 75,
      height: 50
    });
    const doc3 = doc('users/c', 1000, {
      first: 'charlie',
      last: 'baker',
      age: 75,
      height: 50
    });
    const doc4 = doc('users/d', 1000, {
      first: 'diane',
      last: 'miller',
      age: 75,
      height: 50
    });
    const doc5 = doc('users/e', 1000, {
      first: 'eric',
      last: 'davis',
      age: 80,
      height: 50
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eq(field('age'), constant(75)))
      .where(gt(field('height'), constant(45)))
      .where(like(field('last'), constant('%er')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4]
    );
  });

  it('exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(exists(field('name')));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3]
    );
  });

  it('not_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(exists(field('name'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4, doc5]
    );
  });

  it('not_not_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(not(exists(field('name')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3]
    );
  });

  it('exists_and_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(and(exists(field('name')), exists(field('age'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2]
    );
  });

  it('exists_or_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(or(exists(field('name')), exists(field('age'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3, doc4]
    );
  });

  it('not_exists_and_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(and(exists(field('name')), exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4, doc5]
    );
  });

  it('not_exists_or_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(or(exists(field('name')), exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc5]
    );
  });

  it('not_exists_xor_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(not(xor(exists(field('name')), exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc5]
    );
  });

  it('and_notExists_notExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(and(not(exists(field('name'))), not(exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc5]
    );
  });

  it('or_notExists_notExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(or(not(exists(field('name'))), not(exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4, doc5]
    );
  });

  it('xor_notExists_notExists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(xor(not(exists(field('name'))), not(exists(field('age')))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc4]
    );
  });

  it('and_notExists_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(and(not(exists(field('name'))), exists(field('age'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc4]
    );
  });

  it('or_notExists_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(or(not(exists(field('name'))), exists(field('age'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc4, doc5]
    );
  });

  it('xor_notExists_exists', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
    const doc3 = doc('users/c', 1000, { name: 'charlie' });
    const doc4 = doc('users/d', 1000, { age: 30 });
    const doc5 = doc('users/e', 1000, { other: true });

    const pipeline = db
      .pipeline()
      .database()
      .where(xor(not(exists(field('name'))), exists(field('age'))));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc5]
    );
  });

  it('whereExpressionIsNotBooleanYielding', () => {
    const doc1 = doc('users/a', 1000, { name: 'alice', age: true });
    const doc2 = doc('users/b', 1000, { name: 'bob', age: '42' });
    const doc3 = doc('users/c', 1000, { name: 'charlie', age: 0 });

    const pipeline = db
      .pipeline()
      .database()
      .where(divide(constant('100'), constant('50')) as unknown as BooleanExpr);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('andExpression_logicallyEquivalent_toSeparatedStages', () => {
    const doc1 = doc('users/a', 1000, { a: 1, b: 1 });
    const doc2 = doc('users/b', 1000, { a: 1, b: 2 });
    const doc3 = doc('users/c', 1000, { a: 2, b: 2 });

    const equalityArgument1 = eq(field('a'), constant(1));
    const equalityArgument2 = eq(field('b'), constant(2));

    let pipeline = db
      .pipeline()
      .database()
      .where(and(equalityArgument1, equalityArgument2));
    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);

    pipeline = db
      .pipeline()
      .database()
      .where(and(equalityArgument2, equalityArgument1));
    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);

    pipeline = db
      .pipeline()
      .database()
      .where(equalityArgument1)
      .where(equalityArgument2);
    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);

    pipeline = db
      .pipeline()
      .database()
      .where(equalityArgument2)
      .where(equalityArgument1);
    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });
});
