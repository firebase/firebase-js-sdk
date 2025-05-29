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

describe('Inequality Queries', () => {
  it('greaterThan', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('score'), constant(90)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('greaterThanOrEqual', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gte(field('score'), constant(90)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('lessThan', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(lt(field('score'), constant(90)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
  });

  it('lessThanOrEqual', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(lte(field('score'), constant(90)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc1
    ]);
  });

  it('notEqual', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(neq(field('score'), constant(90)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('notEqual_returnsMixedTypes', () => {
    const doc1 = doc('users/alice', 1000, { score: 90 });
    const doc2 = doc('users/boc', 1000, { score: true });
    const doc3 = doc('users/charlie', 1000, { score: 42.0 });
    const doc4 = doc('users/drew', 1000, { score: 'abc' });
    const doc5 = doc('users/eric', 1000, { score: new Date(2000) }); // Assuming Timestamps are represented as Dates
    const doc6 = doc('users/francis', 1000, { score: { lat: 0, lng: 0 } }); // Assuming LatLng is represented as an object
    const doc7 = doc('users/george', 1000, { score: [42] });
    const doc8 = doc('users/hope', 1000, { score: { foo: 42 } });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(neq(field('score'), constant(90)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc2, doc3, doc4, doc5, doc6, doc7, doc8]);
  });

  it('comparisonHasImplicitBound', () => {
    const doc1 = doc('users/alice', 1000, { score: 42 });
    const doc2 = doc('users/boc', 1000, { score: 100.0 });
    const doc3 = doc('users/charlie', 1000, { score: true });
    const doc4 = doc('users/drew', 1000, { score: 'abc' });
    const doc5 = doc('users/eric', 1000, { score: new Date(2000) }); // Assuming Timestamps are represented as Dates
    const doc6 = doc('users/francis', 1000, { score: { lat: 0, lng: 0 } }); // Assuming LatLng is represented as an object
    const doc7 = doc('users/george', 1000, { score: [42] });
    const doc8 = doc('users/hope', 1000, { score: { foo: 42 } });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('score'), constant(42)));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc2]);
  });

  it('not_comparison_returnsMixedType', () => {
    const doc1 = doc('users/alice', 1000, { score: 42 });
    const doc2 = doc('users/boc', 1000, { score: 100.0 });
    const doc3 = doc('users/charlie', 1000, { score: true });
    const doc4 = doc('users/drew', 1000, { score: 'abc' });
    const doc5 = doc('users/eric', 1000, { score: new Date(2000) }); // Assuming Timestamps are represented as Dates
    const doc6 = doc('users/francis', 1000, { score: { lat: 0, lng: 0 } }); // Assuming LatLng is represented as an object
    const doc7 = doc('users/george', 1000, { score: [42] });
    const doc8 = doc('users/hope', 1000, { score: { foo: 42 } });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(not(gt(field('score'), constant(90))));

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7, doc8])
    ).to.deep.equal([doc1, doc3, doc4, doc5, doc6, doc7, doc8]);
  });

  it('inequality_withEquality_onDifferentField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(eq(field('rank'), constant(2)), gt(field('score'), constant(80)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('inequality_withEquality_onSameField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(eq(field('score'), constant(90)), gt(field('score'), constant(80)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('withSort_onSameField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gte(field('score'), constant(90)))
      .sort(field('score').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3
    ]);
  });

  it('withSort_onDifferentFields', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gte(field('score'), constant(90)))
      .sort(field('rank').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1
    ]);
  });

  it('withOr_onSingleField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(gt(field('score'), constant(90)), lt(field('score'), constant(60)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc3
    ]);
  });

  it('withOr_onDifferentFields', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        or(gt(field('score'), constant(80)), lt(field('rank'), constant(2)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('withEqAny_onSingleField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          gt(field('score'), constant(80)),
          eqAny(field('score'), [constant(50), constant(80), constant(97)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('withEqAny_onDifferentFields', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          lt(field('rank'), constant(3)),
          eqAny(field('score'), [constant(50), constant(80), constant(97)])
        )
      );
    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('withNotEqAny_onSingleField', () => {
    const doc1 = doc('users/bob', 1000, { notScore: 90 });
    const doc2 = doc('users/alice', 1000, { score: 90 });
    const doc3 = doc('users/charlie', 1000, { score: 50 });
    const doc4 = doc('users/diane', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          gt(field('score'), constant(80)),
          notEqAny(field('score'), [constant(90), constant(95)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc4
    ]);
  });

  it('withNotEqAny_returnsMixedTypes', () => {
    const doc1 = doc('users/bob', 1000, { notScore: 90 });
    const doc2 = doc('users/alice', 1000, { score: 90 });
    const doc3 = doc('users/charlie', 1000, { score: true });
    const doc4 = doc('users/diane', 1000, { score: 42.0 });
    const doc5 = doc('users/eric', 1000, { score: NaN });
    const doc6 = doc('users/francis', 1000, { score: 'abc' });
    const doc7 = doc('users/george', 1000, { score: new Date(2000) }); // Assuming Timestamps are represented as Dates
    const doc8 = doc('users/hope', 1000, { score: { lat: 0, lng: 0 } }); // Assuming LatLng is represented as an object
    const doc9 = doc('users/isla', 1000, { score: [42] });
    const doc10 = doc('users/jack', 1000, { score: { foo: 42 } });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        notEqAny(field('score'), [
          constant('foo'),
          constant(90),
          constant(false)
        ])
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
        doc9,
        doc10
      ])
    ).to.deep.equal([doc3, doc4, doc5, doc6, doc7, doc8, doc9, doc10]);
  });

  it('withNotEqAny_onDifferentFields', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          lt(field('rank'), constant(3)),
          notEqAny(field('score'), [constant(90), constant(95)])
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('sortByEquality', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 4 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });
    const doc4 = doc('users/david', 1000, { score: 91, rank: 2 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(eq(field('rank'), constant(2)), gt(field('score'), constant(80)))
      )
      .sort(field('rank').ascending(), field('score').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc1, doc4]);
  });

  it('withEqAny_sortByEquality', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 3 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 4 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });
    const doc4 = doc('users/david', 1000, { score: 91, rank: 2 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          eqAny(field('rank'), [constant(2), constant(3), constant(4)]),
          gt(field('score'), constant(80))
        )
      )
      .sort(field('rank').ascending(), field('score').ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc4, doc1]);
  });

  it('withArray', () => {
    const doc1 = doc('users/bob', 1000, {
      scores: [80, 85, 90],
      rounds: [1, 2, 3]
    });
    const doc2 = doc('users/alice', 1000, {
      scores: [50, 65],
      rounds: [1, 2]
    });
    const doc3 = doc('users/charlie', 1000, {
      scores: [90, 95, 97],
      rounds: [1, 2, 4]
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          lte(field('scores'), constantArray([90, 90, 90])),
          gt(field('rounds'), constantArray([1, 2]))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('withArrayContainsAny', () => {
    const doc1 = doc('users/bob', 1000, {
      scores: [80, 85, 90],
      rounds: [1, 2, 3]
    });
    const doc2 = doc('users/alice', 1000, {
      scores: [50, 65],
      rounds: [1, 2]
    });
    const doc3 = doc('users/charlie', 1000, {
      scores: [90, 95, 97],
      rounds: [1, 2, 4]
    });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(
          lte(field('scores'), constantArray([90, 90, 90])),
          arrayContains(field('rounds'), constant(3)) as BooleanExpr
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
  });

  it('withSortAndLimit', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 3 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 4 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });
    const doc4 = doc('users/david', 1000, { score: 91, rank: 2 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('score'), constant(80)))
      .sort(field('rank').ascending())
      .limit(2);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc3, doc4]);
  });

  it('withSortAndOffset', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 3 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 4 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });
    const doc4 = doc('users/david', 1000, { score: 91, rank: 2 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(gt(field('score'), constant(80)))
      .sort(field('rank').ascending())
      .offset(1);

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4])
    ).to.have.ordered.members([doc4, doc1]);
  });

  it('multipleInequalities_onSingleField', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(gt(field('score'), constant(90)), lt(field('score'), constant(100)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('multipleInequalities_onDifferentFields_singleMatch', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(gt(field('score'), constant(90)), lt(field('rank'), constant(2)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
  });

  it('multipleInequalities_onDifferentFields_multipleMatch', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(gt(field('score'), constant(80)), lt(field('rank'), constant(3)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('multipleInequalities_onDifferentFields_allMatch', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(gt(field('score'), constant(40)), lt(field('rank'), constant(4)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('multipleInequalities_onDifferentFields_noMatch', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('score'), constant(90)), gt(field('rank'), constant(3)))
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  });

  it('multipleInequalities_withBoundedRanges', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 4 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });
    const doc4 = doc('users/david', 1000, { score: 80, rank: 3 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        apiAnd(
          gt(field('rank'), constant(0)),
          lt(field('rank'), constant(4)),
          gt(field('score'), constant(80)),
          lt(field('score'), constant(95))
        )
      );

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1
    ]);
  });

  it('multipleInequalities_withSingleSortAsc', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('rank'), constant(3)), gt(field('score'), constant(80)))
      )
      .sort(field('rank').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1
    ]);
  });

  it('multipleInequalities_withSingleSortDesc', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('rank'), constant(3)), gt(field('score'), constant(80)))
      )
      .sort(field('rank').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3
    ]);
  });

  it('multipleInequalities_withMultipleSortAsc', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('rank'), constant(3)), gt(field('score'), constant(80)))
      )
      .sort(field('rank').ascending(), field('score').ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1
    ]);
  });

  it('multipleInequalities_withMultipleSortDesc', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('rank'), constant(3)), gt(field('score'), constant(80)))
      )
      .sort(field('rank').descending(), field('score').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3
    ]);
  });

  it('multipleInequalities_withMultipleSortDesc_onReverseIndex', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(
        and(lt(field('rank'), constant(3)), gt(field('score'), constant(80)))
      )
      .sort(field('score').descending(), field('rank').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1
    ]);
  });
});
