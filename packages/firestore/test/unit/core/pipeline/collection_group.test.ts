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

describe('collection group stage', () => {
  it('returns no result from empty db', () => {
    expect(runPipeline(db.pipeline().collectionGroup('users'), [])).to.be.empty;
  });

  it('returns single document', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });

    expect(
      runPipeline(db.pipeline().collectionGroup('users'), [doc1])
    ).to.deep.equal([doc1]);
  });

  it('returns multiple documents', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(db.pipeline().collectionGroup('users'), [doc1, doc2, doc3])
    ).to.deep.equal([doc2, doc1, doc3]);
  });

  it('skips other collection ids', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users-other/bob', 1000, { score: 90 });
    const doc3 = doc('users/alice', 1000, { score: 50 });
    const doc4 = doc('users-other/alice', 1000, { score: 50 });
    const doc5 = doc('users/charlie', 1000, { score: 97 });
    const doc6 = doc('users-other/charlie', 1000, { score: 97 });

    expect(
      runPipeline(db.pipeline().collectionGroup('users'), [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6
      ])
    ).to.deep.equal([doc3, doc1, doc5]);
  });

  it('different parents', () => {
    const doc1 = doc('users/bob/games/game1', 1000, { score: 90, order: 1 });
    const doc2 = doc('users/alice/games/game1', 1000, {
      score: 90,
      order: 2
    });
    const doc3 = doc('users/bob/games/game2', 1000, { score: 20, order: 3 });
    const doc4 = doc('users/charlie/games/game1', 1000, {
      score: 20,
      order: 4
    });
    const doc5 = doc('users/bob/games/game3', 1000, { score: 30, order: 5 });
    const doc6 = doc('users/alice/games/game2', 1000, {
      score: 30,
      order: 6
    });
    const doc7 = doc('users/charlie/profiles/profile1', 1000, { order: 7 });

    expect(
      runPipeline(
        db.pipeline().collectionGroup('games').sort(field('order').ascending()),
        [doc1, doc2, doc3, doc4, doc5, doc6, doc7]
      )
    ).to.deep.equal([doc1, doc2, doc3, doc4, doc5, doc6]);
  });

  it('different parents_stableOrdering_onPath', () => {
    const doc1 = doc('users/bob/games/1', 1000, { score: 90 });
    const doc2 = doc('users/alice/games/2', 1000, { score: 90 });
    const doc3 = doc('users/bob/games/3', 1000, { score: 20 });
    const doc4 = doc('users/charlie/games/4', 1000, { score: 20 });
    const doc5 = doc('users/bob/games/5', 1000, { score: 30 });
    const doc6 = doc('users/alice/games/6', 1000, { score: 30 });
    const doc7 = doc('users/charlie/profiles/7', 1000, {});

    const pipeline = db
      .pipeline()
      .collectionGroup('games')
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc2, doc6, doc1, doc3, doc5, doc4]);
  });

  it('different parents_stableOrdering_onKey', () => {
    const doc1 = doc('users/bob/games/1', 1000, { score: 90 });
    const doc2 = doc('users/alice/games/2', 1000, { score: 90 });
    const doc3 = doc('users/bob/games/3', 1000, { score: 20 });
    const doc4 = doc('users/charlie/games/4', 1000, { score: 20 });
    const doc5 = doc('users/bob/games/5', 1000, { score: 30 });
    const doc6 = doc('users/alice/games/6', 1000, { score: 30 });
    const doc7 = doc('users/charlie/profiles/7', 1000, {});

    const pipeline = db
      .pipeline()
      .collectionGroup('games')
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(
      runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6, doc7])
    ).to.deep.equal([doc2, doc6, doc1, doc3, doc5, doc4]);
  });

  // TODO(pipeline): Uncomment when we implement collection id
  // it('where_sameCollectionId_onPath', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline()
  //     .collectionGroup('users')
  //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('users')));
  //
  //   expect(
  //     runPipeline(pipeline, [doc1, doc2, doc3])
  //   ).to.deep.equal([doc1, doc2, doc3]);
  // });
  //
  // it('where_sameCollectionId_onKey', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline()
  //     .collectionGroup('users')
  //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('users')));
  //
  //   expect(
  //     runPipeline(pipeline, [doc1, doc2, doc3])
  //   ).to.deep.equal([doc1, doc2, doc3]);
  // });

  // it('where_differentCollectionId_onPath', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline()
  //     .collectionGroup('users')
  //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('games')));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  // });
  //
  // it('where_differentCollectionId_onKey', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline()
  //     .collectionGroup('users')
  //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('games')));
  //
  //   expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  // });

  it('where_onValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });
    const doc4 = doc('users/diane', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(eqAny(field('score'), [constant(90), constant(97)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1,
      doc3,
      doc4
    ]);
  });

  it('where_inequalityOnValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(field('score').gt(constant(80)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_notEqualOnValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(field('score').neq(constant(50)));

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('where_arrayContainsValues', () => {
    const doc1 = doc('users/bob', 1000, {
      score: 90,
      rounds: ['round1', 'round3']
    });
    const doc2 = doc('users/alice', 1000, {
      score: 50,
      rounds: ['round2', 'round4']
    });
    const doc3 = doc('users/charlie', 1000, {
      score: 97,
      rounds: ['round2', 'round3', 'round4']
    });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .where(arrayContains(field('rounds'), constant('round3')) as BooleanExpr);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
      doc1,
      doc3
    ]);
  });

  it('sort_onValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(field('score').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1,
      doc2
    ]);
  });

  it('sort_onValues has dense semantics', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { number: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(field('score').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc2,
      doc3
    ]);
  });

  it('sort_onPath', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1,
      doc3
    ]);
  });

  it('limit', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .limit(2);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1
    ]);
  });

  it('offset', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collectionGroup('users')
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .offset(1);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc1,
      doc3
    ]);
  });
});
