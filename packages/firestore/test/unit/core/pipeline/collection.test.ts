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

describe('collection stage', () => {
  it('emptyDatabase_returnsNoResults', () => {
    expect(runPipeline(db.pipeline().collection('/users'), [])).to.be.empty;
  });

  it('emptyCollection_otherCollectionIds_returnsNoResults', () => {
    const doc1 = doc('users/alice/games/doc1', 1000, { title: 'minecraft' });
    const doc2 = doc('users/charlie/games/doc1', 1000, { title: 'halo' });

    expect(
      runPipeline(db.pipeline().collection('/users/bob/games'), [doc1, doc2])
    ).to.be.empty;
  });

  it('emptyCollection_otherParents_returnsNoResults', () => {
    const doc1 = doc('users/bob/addresses/doc1', 1000, { city: 'New York' });
    const doc2 = doc('users/bob/inventories/doc1', 1000, { item_id: 42 });

    expect(
      runPipeline(db.pipeline().collection('/users/bob/games'), [doc1, doc2])
    ).to.be.empty;
  });

  it('singleton_atRoot_returnsSingleDocument', () => {
    const doc1 = doc('games/42', 1000, { title: 'minecraft' });
    const doc2 = doc('users/bob', 1000, { score: 90, rank: 1 });
    expect(
      runPipeline(db.pipeline().collection('/users'), [doc1, doc2])
    ).to.deep.equal([doc2]);
  });

  it('singleton_nestedCollection_returnsSingleDocument', () => {
    const doc1 = doc('users/bob/addresses/doc1', 1000, { city: 'New York' });
    const doc2 = doc('users/bob/games/doc1', 1000, { title: 'minecraft' });
    const doc3 = doc('users/alice/games/doc1', 1000, { title: 'halo' });

    expect(
      runPipeline(db.pipeline().collection('/users/bob/games'), [
        doc1,
        doc2,
        doc3
      ])
    ).to.deep.equal([doc2]);
  });

  it('multipleDocuments_atRoot_returnsDocuments', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
    const doc4 = doc('games/doc1', 1000, { title: 'minecraft' });

    expect(
      runPipeline(db.pipeline().collection('/users'), [doc1, doc2, doc3, doc4])
    ).to.deep.equal([doc2, doc1, doc3]);
  });

  it('multipleDocuments_nestedCollection_returnsDocuments', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
    const doc4 = doc('games/doc1', 1000, { title: 'minecraft' });

    expect(
      runPipeline(db.pipeline().collection('/users'), [doc1, doc2, doc3, doc4])
    ).to.deep.equal([doc2, doc1, doc3]);
  });

  it('subcollection_notReturned', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users/bob/games/minecraft', 1000, {
      title: 'minecraft'
    });
    const doc3 = doc('users/bob/games/minecraft/players/player1', 1000, {
      location: 'sf'
    });

    expect(
      runPipeline(db.pipeline().collection('/users'), [doc1, doc2, doc3])
    ).to.deep.equal([doc1]);
  });

  it('skipsOtherCollectionIds', () => {
    const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
    const doc2 = doc('users-other/bob', 1000, { score: 90, rank: 1 });
    const doc3 = doc('users/alice', 1000, { score: 50, rank: 3 });
    const doc4 = doc('users-other/alice', 1000, { score: 50, rank: 3 });
    const doc5 = doc('users/charlie', 1000, { score: 97, rank: 2 });
    const doc6 = doc('users-other/charlie', 1000, { score: 97, rank: 2 });

    expect(
      runPipeline(db.pipeline().collection('/users'), [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6
      ])
    ).to.deep.equal([doc3, doc1, doc5]);
  });

  it('skipsOtherParents', () => {
    const doc1 = doc('users/bob/games/doc1', 1000, { score: 90 });
    const doc2 = doc('users/alice/games/doc1', 1000, { score: 90 });
    const doc3 = doc('users/bob/games/doc2', 1000, { score: 20 });
    const doc4 = doc('users/charlie/games/doc1', 1000, { score: 20 });
    const doc5 = doc('users/bob/games/doc3', 1000, { score: 30 });
    const doc6 = doc('users/alice/games/doc1', 1000, { score: 30 });

    expect(
      runPipeline(db.pipeline().collection('/users/bob/games'), [
        doc1,
        doc2,
        doc3,
        doc4,
        doc5,
        doc6
      ])
    ).to.deep.equal([doc1, doc3, doc5]);
  });

  it('where_onValues', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });
    const doc4 = doc('users/diane', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
      .where(eqAny(field('score'), [constant(90), constant(97)]));

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
      doc1,
      doc3,
      doc4
    ]);
  });

  // it('where_sameCollectionId_onPath', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline().collection('/users').where(
  //     eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('users'))
  //   );
  //
  //   expect(
  //     runPipeline(pipeline, [doc1, doc2, doc3])
  //   ).to.deep.equal([doc1, doc2, doc3]);
  // });

  // it('where_sameCollectionId_onKey', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline().collection('/users').where(
  //     eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('users'))
  //   );
  //
  //   expect(
  //     runPipeline(pipeline, [doc1, doc2, doc3])
  //   ).to.deep.equal([doc1, doc2, doc3]);
  // });
  //
  // it('where_differentCollectionId_onPath', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline().collection('/users').where(
  //     eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('games'))
  //   );
  //
  //   expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
  // });
  //
  // it('where_differentCollectionId_onKey', () => {
  //   const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
  //   const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
  //   const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
  //
  //   const pipeline = db.pipeline().collection('/users').where(
  //     eq(collectionId(field('DOCUMENT_KEY_NAME')), constant('games'))
  //   );
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
      .collection('/users')
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
      .collection('/users')
      .where(gt(field('score'), constant(80)));

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
      .collection('/users')
      .where(neq(field('score'), constant(50)));

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
      .collection('/users')
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
      .collection('/users')
      .sort(field('score').descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc3,
      doc1,
      doc2
    ]);
  });

  it('sort_onPath', () => {
    const doc1 = doc('users/bob', 1000, { score: 90 });
    const doc2 = doc('users/alice', 1000, { score: 50 });
    const doc3 = doc('users/charlie', 1000, { score: 97 });

    const pipeline = db
      .pipeline()
      .collection('/users')
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
      .collection('/users')
      .sort(field(DOCUMENT_KEY_NAME).ascending())
      .limit(2);

    expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members([
      doc2,
      doc1
    ]);
  });

  it('sort_onKey_ascending', () => {
    const doc1 = doc('users/bob/games/a', 1000, { title: 'minecraft' });
    const doc2 = doc('users/bob/games/b', 1000, { title: 'halo' });
    const doc3 = doc('users/bob/games/c', 1000, { title: 'mariocart' });
    const doc4 = doc('users/bob/inventories/a', 1000, { type: 'sword' });
    const doc5 = doc('users/alice/games/c', 1000, { title: 'skyrim' });

    const pipeline = db
      .pipeline()
      .collection('/users/bob/games')
      .sort(field(DOCUMENT_KEY_NAME).ascending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc1, doc2, doc3]
    );
  });

  it('sort_onKey_descending', () => {
    const doc1 = doc('users/bob/games/a', 1000, { title: 'minecraft' });
    const doc2 = doc('users/bob/games/b', 1000, { title: 'halo' });
    const doc3 = doc('users/bob/games/c', 1000, { title: 'mariocart' });
    const doc4 = doc('users/bob/inventories/a', 1000, { type: 'sword' });
    const doc5 = doc('users/alice/games/c', 1000, { title: 'skyrim' });

    const pipeline = db
      .pipeline()
      .collection('/users/bob/games')
      .sort(field(DOCUMENT_KEY_NAME).descending());

    expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])).to.deep.equal(
      [doc3, doc2, doc1]
    );
  });
});
