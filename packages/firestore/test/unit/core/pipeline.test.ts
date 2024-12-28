/**
 * @license
 * Copyright 2024 Google LLC
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
  add,
  arrayContains,
  arrayContainsAny,
  Constant,
  divide,
  doc as docRef,
  eq,
  eqAny,
  exists,
  Field,
  FilterExpr,
  gt,
  gte,
  isNan,
  like,
  lt,
  lte,
  multiply,
  neq,
  not,
  notEqAny,
  regexMatch,
  useFluentPipelines,
  xor
} from '../../../src';

import { doc } from '../../util/helpers';
import {
  andFunction,
  isNull,
  orFunction
} from '../../../src/lite-api/expressions';
import { newTestFirestore } from '../../util/api_helpers';
import {
  canonifyPipeline,
  pipelineEq,
  runPipeline
} from '../../util/pipelines';
import {
  CREATE_TIME_NAME,
  DOCUMENT_KEY_NAME,
  UPDATE_TIME_NAME
} from '../../../src/model/path';
import { MutableDocument } from '../../../src/model/document';

const db = newTestFirestore();
useFluentPipelines();
describe('Pipeline Canonify', () => {
  it('works as expected for simple where clause', () => {
    const p = db.pipeline().collection('test').where(eq(`foo`, 42));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))'
    );
  });

  it('works as expected for multiple stages', () => {
    const p = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .limit(10)
      .sort(Field.of('bar').descending());

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|where(fn(eq,[fld(foo),cst(42)]))|limit(10)|sort(fld(bar) descending)'
    );
  });

  it('works as expected for addFields stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .addFields(Field.of('existingField'), Constant.of(10).as('val'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|add_fields(existingField=fld(existingField),val=cst(10))'
    );
  });

  it('works as expected for aggregate stage with grouping', () => {
    const p = db
      .pipeline()
      .collection('test')
      .aggregate({
        accumulators: [Field.of('value').sum().as('totalValue')],
        groups: ['category']
      });

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|aggregate(totalValue=fn(sum,[fld(value)]))grouping(category=fld(category))'
    );
  });

  it('works as expected for distinct stage', () => {
    const p = db.pipeline().collection('test').distinct('category', 'city');

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|distinct(category=fld(category),city=fld(city))'
    );
  });

  it('works as expected for select stage', () => {
    const p = db.pipeline().collection('test').select('name', Field.of('age'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|select(age=fld(age),name=fld(name))'
    );
  });

  it('works as expected for offset stage', () => {
    const p = db.pipeline().collection('test').offset(5);

    expect(canonifyPipeline(p)).to.equal('collection(/test)|offset(5)');
  });

  it('works as expected for FindNearest stage', () => {
    const p = db
      .pipeline()
      .collection('test')
      .findNearest({
        field: Field.of('location'),
        vectorValue: [1, 2, 3],
        distanceMeasure: 'cosine',
        limit: 10,
        distanceField: 'distance'
      });

    // Note: The exact string representation of the mapValue might vary depending on
    // how GeoPoint is implemented. Adjust the expected string accordingly.
    expect(canonifyPipeline(p)).to.equal(
      'collection(/test)|find_nearest(fld(location),cosine,[1,2,3],10,distance)'
    );
  });

  it('works as expected for CollectionGroupSource stage', () => {
    const p = db.pipeline().collectionGroup('cities');

    expect(canonifyPipeline(p)).to.equal('collection_group(cities)');
  });

  it('works as expected for DatabaseSource stage', () => {
    const p = db.pipeline().database(); // Assuming you have a `database()` method on your `db` object

    expect(canonifyPipeline(p)).to.equal('database()');
  });

  it('works as expected for DocumentsSource stage', () => {
    const p = db
      .pipeline()
      .documents([docRef(db, 'cities/SF'), docRef(db, 'cities/LA')]);

    expect(canonifyPipeline(p)).to.equal('documents(/cities/LA,/cities/SF)');
  });

  it('works as expected for eqAny and arrays', () => {
    const p = db
      .pipeline()
      .collection('foo')
      .where(Field.of('bar').eqAny('a', 'b'));

    expect(canonifyPipeline(p)).to.equal(
      'collection(/foo)|where(fn(eq_any,[fld(bar),list([cst("a"),cst("b")])]))'
    );
  });
});

describe('pipelineEq', () => {
  it('returns true for identical pipelines', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db.pipeline().collection('test').where(eq(`foo`, 42));

    expect(pipelineEq(p1, p2)).to.be.true;
  });

  it('returns false for pipelines with different stages', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db.pipeline().collection('test').limit(10);

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different parameters within a stage', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42));
    const p2 = db
      .pipeline()
      .collection('test')
      .where(eq(Field.of(`bar`), 42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns false for pipelines with different order of stages', () => {
    const p1 = db.pipeline().collection('test').where(eq(`foo`, 42)).limit(10);
    const p2 = db.pipeline().collection('test').limit(10).where(eq(`foo`, 42));

    expect(pipelineEq(p1, p2)).to.be.false;
  });

  it('returns true for for different select order', () => {
    const p1 = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .select('foo', 'bar');
    const p2 = db
      .pipeline()
      .collection('test')
      .where(eq(`foo`, 42))
      .select('bar', 'foo');

    expect(pipelineEq(p1, p2)).to.be.true;
  });
});

describe('runPipeline()', () => {
  describe('collection group stage', () => {
    it('returns no result from empty db', () => {
      expect(runPipeline(db.pipeline().collectionGroup('users'), [])).to.be
        .empty;
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
      ).to.deep.equal([doc1, doc2, doc3]);
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
      ).to.deep.equal([doc1, doc3, doc5]);
    });

    it('different parents', () => {
      const doc1 = doc('users/bob/games/game1', 1000, { score: 90 });
      const doc2 = doc('users/alice/games/game1', 1000, { score: 90 });
      const doc3 = doc('users/bob/games/game2', 1000, { score: 20 });
      const doc4 = doc('users/charlie/games/game1', 1000, { score: 20 });
      const doc5 = doc('users/bob/games/game3', 1000, { score: 30 });
      const doc6 = doc('users/alice/games/game2', 1000, { score: 30 });
      const doc7 = doc('users/charlie/profiles/profile1', 1000, {});

      expect(
        runPipeline(db.pipeline().collectionGroup('games'), [
          doc1,
          doc2,
          doc3,
          doc4,
          doc5,
          doc6,
          doc7
        ])
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
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

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
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

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
    //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('users')));
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
    //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('users')));
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
    //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('games')));
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
    //     .where(eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('games')));
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
        .where(eqAny(Field.of('score'), [Constant.of(90), Constant.of(97)]));

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
        .where(Field.of('score').gt(Constant.of(80)));

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
        .where(Field.of('score').neq(Constant.of(50)));

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
        .where(arrayContains(Field.of('rounds'), Constant.of('round3')));

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
        .sort(Field.of('score').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1, doc2]
      );
    });

    it('sort_onValues has dense semantics', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { number: 97 });

      const pipeline = db
          .pipeline()
          .collectionGroup('users')
          .sort(Field.of('score').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
          [doc1, doc2, doc3]
      );
    });

    it('sort_onPath', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collectionGroup('users')
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('limit', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collectionGroup('users')
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .limit(2);

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1]
      );
    });

    it('offset', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collectionGroup('users')
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .offset(1);

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3]
      );
    });
  });

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
        runPipeline(db.pipeline().collection('/users'), [
          doc1,
          doc2,
          doc3,
          doc4
        ])
      ).to.deep.equal([doc1, doc2, doc3]);
    });

    it('multipleDocuments_nestedCollection_returnsDocuments', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });
      const doc4 = doc('games/doc1', 1000, { title: 'minecraft' });

      expect(
        runPipeline(db.pipeline().collection('/users'), [
          doc1,
          doc2,
          doc3,
          doc4
        ])
      ).to.deep.equal([doc1, doc2, doc3]);
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
      ).to.deep.equal([doc1, doc3, doc5]);
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
        .where(eqAny(Field.of('score'), [Constant.of(90), Constant.of(97)]));

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
    //     eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('users'))
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
    //     eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('users'))
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
    //     eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('games'))
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
    //     eq(collectionId(field('DOCUMENT_KEY_NAME')), Constant.of('games'))
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
        .where(eqAny(Field.of('score'), [Constant.of(90), Constant.of(97)]));

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
        .where(gt(Field.of('score'), Constant.of(80)));

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
        .where(neq(Field.of('score'), Constant.of(50)));

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
        .where(arrayContains(Field.of('rounds'), Constant.of('round3')));

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
        .sort(Field.of('score').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1, doc2]
      );
    });

    it('sort_onPath', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('limit', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .limit(2);

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1]
      );
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
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3]);
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
        .sort(Field.of(DOCUMENT_KEY_NAME).descending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc2, doc1]);
    });
  });

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
      ).to.deep.equal([doc1, doc2, doc3]);
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
        .where(eq(Field.of(DOCUMENT_KEY_NAME), Constant.of(docRef(db, 'b/2'))));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
    });
  });

  describe('documents stage', () => {
    it('emptyRequest_isRejected', () => {
      expect(() => runPipeline(db.pipeline().documents([]), [])).to.throw();
    });

    it('duplicateKeys_isRejected', () => {
      expect(() =>
        runPipeline(
          db
            .pipeline()
            .documents([
              docRef(db, '/k/1'),
              docRef(db, '/k/2'),
              docRef(db, '/k/1')
            ]),
          []
        )
      ).to.throw();
    });

    it('emptyDatabase_returnsNoResults', () => {
      expect(runPipeline(db.pipeline().documents([docRef(db, '/users/a')]), []))
        .to.be.empty;
    });

    it('singleDocument_returnsDocument', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      expect(
        runPipeline(db.pipeline().documents([docRef(db, '/users/bob')]), [doc1])
      ).to.deep.equal([doc1]);
    });

    it('singleMissingDocument_returnsNoResults', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      expect(
        runPipeline(db.pipeline().documents([docRef(db, '/users/alice')]), [
          doc1
        ])
      ).to.be.empty;
    });

    it('multipleDocuments_returnsDocuments', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      expect(
        runPipeline(
          db
            .pipeline()
            .documents([
              docRef(db, '/users/bob'),
              docRef(db, '/users/alice'),
              docRef(db, '/users/charlie')
            ]),
          [doc1, doc2, doc3]
        )
      ).to.deep.equal([doc1, doc2, doc3]);
    });

    it('hugeDocumentCount_returnsDocuments', function () {
      this.timeout(10000); // Increase timeout for this test case to 10 seconds

      const size = 5000;
      const keys = [];
      const docs = [];
      for (let i = 0; i < size; i++) {
        keys.push(docRef(db, '/k/' + (i + 1)));
        docs.push(doc('k/' + (i + 1), 1000, { v: i }));
      }

      expect(runPipeline(db.pipeline().documents(keys), docs)).to.deep.equal(
        docs
      );
    });

    it('partiallyMissingDocuments_returnsDocuments', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/diane', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      expect(
        runPipeline(
          db
            .pipeline()
            .documents([
              docRef(db, '/users/bob'),
              docRef(db, '/users/alice'),
              docRef(db, '/users/charlie')
            ]),
          [doc1, doc2, doc3]
        )
      ).to.deep.equal([doc1, doc3]);
    });

    it('multipleCollections_returnsDocuments', () => {
      const doc1 = doc('c/1', 1000, { score: 90, rank: 1 });
      const doc2 = doc('b/2', 1000, { score: 50, rank: 3 });
      const doc3 = doc('a/3', 1000, { score: 97, rank: 2 });

      expect(
        runPipeline(
          db
            .pipeline()
            .documents([
              docRef(db, '/a/3'),
              docRef(db, '/b/2'),
              docRef(db, '/c/1')
            ])
            .sort(Field.of(DOCUMENT_KEY_NAME).ascending()),
          [doc1, doc2, doc3]
        )
      ).to.deep.equal([doc3, doc2, doc1]);
    });

    it('sort_onPath_ascending', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      const pipeline = db
        .pipeline()
        .documents([
          docRef(db, '/users/bob'),
          docRef(db, '/users/alice'),
          docRef(db, '/users/charlie')
        ])
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('sort_onPath_descending', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      const pipeline = db
        .pipeline()
        .documents([
          docRef(db, '/users/bob'),
          docRef(db, '/users/alice'),
          docRef(db, '/users/charlie')
        ])
        .sort(Field.of(DOCUMENT_KEY_NAME).descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1, doc2]
      );
    });

    it('sort_onKey_ascending', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      const pipeline = db
        .pipeline()
        .documents([
          docRef(db, '/users/bob'),
          docRef(db, '/users/alice'),
          docRef(db, '/users/charlie')
        ])
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('sort_onKey_descending', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      const pipeline = db
        .pipeline()
        .documents([
          docRef(db, '/users/bob'),
          docRef(db, '/users/alice'),
          docRef(db, '/users/charlie')
        ])
        .sort(Field.of(DOCUMENT_KEY_NAME).descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1, doc2]
      );
    });

    it('limit', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 1 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 2 });

      const pipeline = db
        .pipeline()
        .documents([
          docRef(db, '/users/bob'),
          docRef(db, '/users/alice'),
          docRef(db, '/users/charlie')
        ])
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .limit(2);

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1]
      );
    });
  });

  describe('Complex Queries', () => {
    const COLLECTION_ID = 'test';
    let docIdCounter = 1;

    beforeEach(() => {
      docIdCounter = 1;
    });

    function seedDatabase(
      numOfDocuments: number,
      numOfFields: number,
      valueSupplier: () => any
    ): MutableDocument[] {
      const documents = [];
      for (let i = 0; i < numOfDocuments; i++) {
        const docData = {};
        for (let j = 1; j <= numOfFields; j++) {
          // @ts-ignore
          docData[`field_${j}`] = valueSupplier();
        }
        const newDoc = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, docData);
        documents.push(newDoc);
        docIdCounter++;
      }
      return documents;
    }

    it('where_withMaxNumberOfStages', () => {
      const numOfFields = 127;
      let valueCounter = 1;
      const documents = seedDatabase(10, numOfFields, () => valueCounter++);

      // TODO(pipeline): Why do i need this hack?
      let pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(eq(Constant.of(1), 1));
      for (let i = 1; i <= numOfFields; i++) {
        pipeline = pipeline.where(gt(Field.of(`field_${i}`), Constant.of(0)));
      }

      expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
    });

    it('eqAny_withMaxNumberOfElements', () => {
      const numOfDocuments = 1000;
      let valueCounter = 1;
      const documents = seedDatabase(numOfDocuments, 1, () => valueCounter++);
      // Add one more document not matching 'in' condition
      documents.push(
        doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: 3001 })
      );

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(
          eqAny(
            Field.of('field_1'),
            Array.from({ length: 3000 }, (_, i) => Constant.of(i + 1))
          )
        );

      expect(runPipeline(pipeline, documents)).to.have.deep.members(
        documents.slice(0, -1)
      ); // Exclude the last document
    });

    it('eqAny_withMaxNumberOfElements_onMultipleFields', () => {
      const numOfFields = 10;
      const numOfDocuments = 100;
      let valueCounter = 1;
      const documents = seedDatabase(
        numOfDocuments,
        numOfFields,
        () => valueCounter++
      );
      // Add one more document not matching 'in' condition
      documents.push(
        doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: 3001 })
      );

      const conditions = [];
      for (let i = 1; i <= numOfFields; i++) {
        conditions.push(
          eqAny(
            Field.of(`field_${i}`),
            Array.from({ length: 3000 }, (_, j) => Constant.of(j + 1))
          )
        );
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(andFunction(conditions[0], ...conditions.slice(1)));

      expect(runPipeline(pipeline, documents)).to.have.deep.members(
        documents.slice(0, -1)
      ); // Exclude the last document
    });

    it('notEqAny_withMaxNumberOfElements', () => {
      const numOfDocuments = 1000;
      let valueCounter = 1;
      const documents = seedDatabase(numOfDocuments, 1, () => valueCounter++);
      // Add one more document matching 'notEqAny' condition
      const doc1 = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, {
        field_1: 3001
      });
      documents.push(doc1);

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(
          notEqAny(
            Field.of('field_1'),
            Array.from({ length: 3000 }, (_, i) => Constant.of(i + 1))
          )
        );

      expect(runPipeline(pipeline, documents)).to.have.deep.members([doc1]);
    });

    it('notEqAny_withMaxNumberOfElements_onMultipleFields', () => {
      const numOfFields = 10;
      const numOfDocuments = 100;
      let valueCounter = 1;
      const documents = seedDatabase(
        numOfDocuments,
        numOfFields,
        () => valueCounter++
      );
      // Add one more document matching 'notEqAny' condition
      const doc1 = doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, {
        field_1: 3001
      });
      documents.push(doc1);

      const conditions = [];
      for (let i = 1; i <= numOfFields; i++) {
        conditions.push(
          notEqAny(
            Field.of(`field_${i}`),
            Array.from({ length: 3000 }, (_, j) => Constant.of(j + 1))
          )
        );
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(orFunction(conditions[0], ...conditions.slice(1)));

      expect(runPipeline(pipeline, documents)).to.have.deep.members([doc1]);
    });

    it('arrayContainsAny_withLargeNumberOfElements', () => {
      const numOfDocuments = 1000;
      let valueCounter = 1;
      const documents = seedDatabase(numOfDocuments, 1, () => [valueCounter++]);
      // Add one more document not matching 'arrayContainsAny' condition
      documents.push(
        doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: [3001] })
      );

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(
          arrayContainsAny(
            Field.of('field_1'),
            Array.from({ length: 3000 }, (_, i) => Constant.of(i + 1))
          )
        );

      expect(runPipeline(pipeline, documents)).to.have.deep.members(
        documents.slice(0, -1)
      ); // Exclude the last document
    });

    it('arrayContainsAny_withMaxNumberOfElements_onMultipleFields', () => {
      const numOfFields = 10;
      const numOfDocuments = 100;
      let valueCounter = 1;
      const documents = seedDatabase(numOfDocuments, numOfFields, () => [
        valueCounter++
      ]);
      // Add one more document not matching 'arrayContainsAny' condition
      documents.push(
        doc(`${COLLECTION_ID}/${docIdCounter}`, 1000, { field_1: [3001] })
      );

      const conditions = [];
      for (let i = 1; i <= numOfFields; i++) {
        conditions.push(
          arrayContainsAny(
            Field.of(`field_${i}`),
            Array.from({ length: 3000 }, (_, j) => Constant.of(j + 1))
          )
        );
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(orFunction(conditions[0], ...conditions.slice(1)));

      expect(runPipeline(pipeline, documents)).to.have.deep.members(
        documents.slice(0, -1)
      ); // Exclude the last document
    });

    it('sortByMaxNumOfFields_withoutIndex', () => {
      const numOfFields = 31;
      const numOfDocuments = 100;
      // Passing a constant value here to reduce the complexity on result assertion.
      const documents = seedDatabase(numOfDocuments, numOfFields, () => 10);
      // sort(field_1, field_2...)
      const sortFields = [];
      for (let i = 1; i <= numOfFields; i++) {
        sortFields.push(Field.of('field_' + i).ascending());
      }
      // add __name__ as the last field in sort.
      sortFields.push(Field.of('__name__').ascending());

      const pipeline = db
        .pipeline()
        .collection('/' + COLLECTION_ID)
        .sort(...sortFields);

      expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
    });

    it('where_withNestedAddFunction_maxDepth', () => {
      const numOfFields = 1;
      const numOfDocuments = 10;
      const documents = seedDatabase(numOfDocuments, numOfFields, () => 0);

      const depth = 31;
      let addFunc = add(Field.of('field_1'), Constant.of(1));
      for (let i = 1; i < depth; i++) {
        addFunc = add(addFunc, Constant.of(1));
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(gt(addFunc, Constant.of(0)));

      expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
    });

    it('where_withLargeNumberOrs', () => {
      const numOfFields = 100;
      const numOfDocuments = 50;
      let valueCounter = 1;
      const documents = seedDatabase(
        numOfDocuments,
        numOfFields,
        () => valueCounter++
      );

      const orConditions = [];
      for (let i = 1; i <= numOfFields; i++) {
        orConditions.push(
          lte(Field.of(`field_${i}`), Constant.of(valueCounter))
        );
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(orFunction(orConditions[0], ...orConditions.slice(1)));

      expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
    });

    it('where_withLargeNumberOfConjunctions', () => {
      const numOfFields = 50;
      const numOfDocuments = 100;
      let valueCounter = 1;
      const documents = seedDatabase(
        numOfDocuments,
        numOfFields,
        () => valueCounter++
      );

      const andConditions1 = [];
      const andConditions2 = [];
      for (let i = 1; i <= numOfFields; i++) {
        andConditions1.push(gt(Field.of(`field_${i}`), Constant.of(0)));
        andConditions2.push(
          lt(Field.of(`field_${i}`), Constant.of(Number.MAX_SAFE_INTEGER))
        );
      }

      const pipeline = db
        .pipeline()
        .collection(`/${COLLECTION_ID}`)
        .where(
          orFunction(
            andFunction(andConditions1[0], ...andConditions1.slice(1)),
            andFunction(andConditions2[0], ...andConditions2.slice(1))
          )
        );

      expect(runPipeline(pipeline, documents)).to.have.deep.members(documents);
    });
  });

  describe('Disjunctive Queries', () => {
    it('basicEqAny', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('charlie'),
            Constant.of('diane'),
            Constant.of('eric')
          ])
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4, doc5]);
    });

    it('multipleEqAny', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane'),
              Constant.of('eric')
            ]),
            eqAny(Field.of('age'), [Constant.of(10), Constant.of(25)])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2, doc4, doc5]);
    });

    it('eqAny_multipleStages', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('charlie'),
            Constant.of('diane'),
            Constant.of('eric')
          ])
        )
        .where(eqAny(Field.of('age'), [Constant.of(10), Constant.of(25)]));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2, doc4, doc5]);
    });

    it('multipleEqAnys_withOr', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eqAny(Field.of('name'), [Constant.of('alice'), Constant.of('bob')]),
            eqAny(Field.of('age'), [Constant.of(10), Constant.of(25)])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc4, doc5]);
    });

    it('eqAny_onCollectionGroup', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('other_users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('root/child/users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('root/child/other_users/e', 1000, {
        name: 'eric',
        age: 10
      });

      const pipeline = db
        .pipeline()
        .collectionGroup('users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('diane'),
            Constant.of('eric')
          ])
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc4]);
    });

    it('eqAny_withSortOnDifferentField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('diane'),
            Constant.of('eric')
          ])
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.members([doc4, doc5, doc2, doc1]);
    });

    it('eqAny_withSortOnEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('diane'),
            Constant.of('eric')
          ])
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc1, doc2, doc4, doc5]);
    });

    it('eqAny_withAdditionalEquality_differentFields', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane'),
              Constant.of('eric')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc4, doc5]);
    });

    it('eqAny_withAdditionalEquality_sameField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('diane'),
              Constant.of('eric')
            ]),
            eq(Field.of('name'), Constant.of('eric'))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc5]);
    });

    it('eqAny_withAdditionalEquality_sameField_emptyResult', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [Constant.of('alice'), Constant.of('bob')]),
            eq(Field.of('name'), Constant.of('other'))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('eqAny_withInequalities_exclusiveRange', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane')
            ]),
            gt(Field.of('age'), Constant.of(10)),
            lt(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2]);
    });

    it('eqAny_withInequalities_inclusiveRange', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane')
            ]),
            gte(Field.of('age'), Constant.of(10)),
            lte(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('eqAny_withInequalitiesAndSort', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane')
            ]),
            gt(Field.of('age'), Constant.of(10)),
            lt(Field.of('age'), Constant.of(100))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc2, doc1]);
    });

    it('eqAny_withNotEqual', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane')
            ]),
            neq(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc4]);
    });

    it('eqAny_sortOnEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('charlie'),
            Constant.of('diane')
          ])
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc1, doc2, doc3, doc4]);
    });

    it('eqAny_singleValue_sortOnInField_ambiguousOrder', () => {
      const doc1 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc2 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc3 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eqAny(Field.of('age'), [Constant.of(10)]))
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc3]
      );
    });

    it('eqAny_withExtraEquality_sortOnEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane'),
              Constant.of('eric')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc4, doc5]);
    });

    it('eqAny_withExtraEquality_sortOnEquality', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane'),
              Constant.of('eric')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc4, doc5]);
    });

    it('eqAny_withInequality_onSameField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('age'), [
              Constant.of(10),
              Constant.of(25),
              Constant.of(100)
            ]),
            gt(Field.of('age'), Constant.of(20))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2, doc3]);
    });

    it('eqAny_withDifferentInequality_sortOnEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            eqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('charlie'),
              Constant.of('diane')
            ]),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc2, doc1, doc3]);
    });

    it('eqAny_containsNull', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: null, age: 25 });
      const doc3 = doc('users/c', 1000, { age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [Constant.of(null), Constant.of('alice')])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2
      ]);
    });

    it('arrayContains_null', () => {
      const doc1 = doc('users/a', 1000, { field: [null, 42] });
      const doc2 = doc('users/b', 1000, { field: [101, null] });
      const doc3 = doc('users/c', 1000, { field: ['foo', 'bar'] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(arrayContains(Field.of('field'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2
      ]);
    });

    it('arrayContainsAny_null', () => {
      const doc1 = doc('users/a', 1000, { field: [null, 42] });
      const doc2 = doc('users/b', 1000, { field: [101, null] });
      const doc3 = doc('users/c', 1000, { field: ['foo', 'bar'] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          arrayContainsAny(Field.of('field'), [
            Constant.of(null),
            Constant.of('foo')
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2,
        doc3
      ]);
    });

    it('eqAny_containsNullOnly', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: null });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eqAny(Field.of('age'), [Constant.of(null)]));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('basicArrayContainsAny', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
      const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
      const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
      const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
      const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          arrayContainsAny(Field.of('groups'), [Constant.of(1), Constant.of(5)])
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc4, doc5]);
    });

    it('multipleArrayContainsAny', () => {
      const doc1 = doc('users/a', 1000, {
        name: 'alice',
        groups: [1, 2, 3],
        records: ['a', 'b', 'c']
      });
      const doc2 = doc('users/b', 1000, {
        name: 'bob',
        groups: [1, 2, 4],
        records: ['b', 'c', 'd']
      });
      const doc3 = doc('users/c', 1000, {
        name: 'charlie',
        groups: [2, 3, 4],
        records: ['b', 'c', 'e']
      });
      const doc4 = doc('users/d', 1000, {
        name: 'diane',
        groups: [2, 3, 5],
        records: ['c', 'd', 'e']
      });
      const doc5 = doc('users/e', 1000, {
        name: 'eric',
        groups: [3, 4, 5],
        records: ['c', 'd', 'f']
      });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            arrayContainsAny(Field.of('groups'), [
              Constant.of(1),
              Constant.of(5)
            ]),
            arrayContainsAny(Field.of('records'), [
              Constant.of('a'),
              Constant.of('e')
            ])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc4]);
    });

    it('arrayContainsAny_withInequality', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
      const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
      const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
      const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
      const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            arrayContainsAny(Field.of('groups'), [
              Constant.of(1),
              Constant.of(5)
            ]),
            lt(Field.of('groups'), Constant.of([3, 4, 5]))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc4]);
    });

    it('arrayContainsAny_withIn', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', groups: [1, 2, 3] });
      const doc2 = doc('users/b', 1000, { name: 'bob', groups: [1, 2, 4] });
      const doc3 = doc('users/c', 1000, { name: 'charlie', groups: [2, 3, 4] });
      const doc4 = doc('users/d', 1000, { name: 'diane', groups: [2, 3, 5] });
      const doc5 = doc('users/e', 1000, { name: 'eric', groups: [3, 4, 5] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            arrayContainsAny(Field.of('groups'), [
              Constant.of(1),
              Constant.of(5)
            ]),
            eqAny(Field.of('name'), [Constant.of('alice'), Constant.of('bob')])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2]);
    });

    it('basicOr', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('bob')),
            eq(Field.of('age'), Constant.of(10))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2,
        doc4
      ]);
    });

    it('multipleOr', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('bob')),
            eq(Field.of('name'), Constant.of('diane')),
            eq(Field.of('age'), Constant.of(25)),
            eq(Field.of('age'), Constant.of(100))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2,
        doc3,
        doc4
      ]);
    });

    it('or_multipleStages', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('bob')),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('diane')),
            eq(Field.of('age'), Constant.of(100))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc4
      ]);
    });

    it('or_twoConjunctions', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            andFunction(
              eq(Field.of('name'), Constant.of('bob')),
              eq(Field.of('age'), Constant.of(25))
            ),
            andFunction(
              eq(Field.of('name'), Constant.of('diane')),
              eq(Field.of('age'), Constant.of(10))
            )
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2,
        doc4
      ]);
    });

    it('or_withInAnd', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            orFunction(
              eq(Field.of('name'), Constant.of('bob')),
              eq(Field.of('age'), Constant.of(10))
            ),
            lt(Field.of('age'), Constant.of(80))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2,
        doc4
      ]);
    });

    it('andOfTwoOrs', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            orFunction(
              eq(Field.of('name'), Constant.of('bob')),
              eq(Field.of('age'), Constant.of(10))
            ),
            orFunction(
              eq(Field.of('name'), Constant.of('diane')),
              eq(Field.of('age'), Constant.of(100))
            )
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc4
      ]);
    });

    it('orOfTwoOrs', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            orFunction(
              eq(Field.of('name'), Constant.of('bob')),
              eq(Field.of('age'), Constant.of(10))
            ),
            orFunction(
              eq(Field.of('name'), Constant.of('diane')),
              eq(Field.of('age'), Constant.of(100))
            )
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2,
        doc3,
        doc4
      ]);
    });

    it('or_withEmptyRangeInOneDisjunction', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('bob')),
            andFunction(
              eq(Field.of('age'), Constant.of(10)),
              gt(Field.of('age'), Constant.of(20))
            )
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2
      ]);
    });

    it('or_withSort', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('diane')),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4])
      ).to.have.ordered.members([doc4, doc2, doc1, doc3]);
    });

    it('or_withInequalityAndSort_sameField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            lt(Field.of('age'), Constant.of(20)),
            gt(Field.of('age'), Constant.of(50))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4])
      ).to.have.ordered.members([doc4, doc1, doc3]);
    });

    it('or_withInequalityAndSort_differentFields', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            lt(Field.of('age'), Constant.of(20)),
            gt(Field.of('age'), Constant.of(50))
          )
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4])
      ).to.have.ordered.members([doc1, doc3, doc4]);
    });

    it('or_withInequalityAndSort_multipleFields', () => {
      const doc1 = doc('users/a', 1000, {
        name: 'alice',
        age: 25,
        height: 170
      });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25, height: 180 });
      const doc3 = doc('users/c', 1000, {
        name: 'charlie',
        age: 100,
        height: 155
      });
      const doc4 = doc('users/d', 1000, {
        name: 'diane',
        age: 10,
        height: 150
      });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 25, height: 170 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            lt(Field.of('age'), Constant.of(80)),
            gt(Field.of('height'), Constant.of(160))
          )
        )
        .sort(
          Field.of('age').ascending(),
          Field.of('height').descending(),
          Field.of('name').ascending()
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc4, doc2, doc1, doc5]);
    });

    it('or_withSortOnPartialMissingField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'diane' });
      const doc4 = doc('users/d', 1000, { name: 'diane', height: 150 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('diane')),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.members([
        doc3,
        doc4,
        doc2,
        doc1
      ]);
    });

    it('or_withLimit', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('diane')),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending())
        .limit(2);

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4])
      ).to.have.ordered.members([doc4, doc2]);
    });

    // TODO(pipeline): uncomment when we have isNot implemented
    it('or_isNullAndEqOnSameField', () => {
      const doc1 = doc('users/a', 1000, { a: 1 });
      const doc2 = doc('users/b', 1000, { a: 1.0 });
      const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
      const doc4 = doc('users/d', 1000, { a: null });
      const doc5 = doc('users/e', 1000, { a: NaN });
      const doc6 = doc('users/f', 1000, { b: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(eq(Field.of('a'), Constant.of(1)), isNull(Field.of('a')))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('or_isNullAndEqOnDifferentField', () => {
      const doc1 = doc('users/a', 1000, { a: 1 });
      const doc2 = doc('users/b', 1000, { a: 1.0 });
      const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
      const doc4 = doc('users/d', 1000, { a: null });
      const doc5 = doc('users/e', 1000, { a: NaN });
      const doc6 = doc('users/f', 1000, { b: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(eq(Field.of('b'), Constant.of(1)), isNull(Field.of('a')))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
      ).to.deep.equal([doc3, doc4]);
    });

    it('or_isNotNullAndEqOnSameField', () => {
      const doc1 = doc('users/a', 1000, { a: 1 });
      const doc2 = doc('users/b', 1000, { a: 1.0 });
      const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
      const doc4 = doc('users/d', 1000, { a: null });
      const doc5 = doc('users/e', 1000, { a: NaN });
      const doc6 = doc('users/f', 1000, { b: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            gt(Field.of('a'), Constant.of(1)),
            not(isNull(Field.of('a')))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
      ).to.deep.equal([doc1, doc2, doc3, doc5, doc6]);
    });

    it('or_isNotNullAndEqOnDifferentField', () => {
      const doc1 = doc('users/a', 1000, { a: 1 });
      const doc2 = doc('users/b', 1000, { a: 1.0 });
      const doc3 = doc('users/c', 1000, { a: 1, b: 1 });
      const doc4 = doc('users/d', 1000, { a: null });
      const doc5 = doc('users/e', 1000, { a: NaN });
      const doc6 = doc('users/f', 1000, { b: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('b'), Constant.of(1)),
            not(isNull(Field.of('a')))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
      ).to.deep.equal([doc1, doc2, doc3, doc5, doc6]);
    });

    it('or_isNullAndIsNaNOnSameField', () => {
      const doc1 = doc('users/a', 1000, { a: null });
      const doc2 = doc('users/b', 1000, { a: NaN });
      const doc3 = doc('users/c', 1000, { a: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(orFunction(isNull(Field.of('a')), isNan(Field.of('a'))));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2
      ]);
    });

    it('or_isNullAndIsNaNOnDifferentField', () => {
      const doc1 = doc('users/a', 1000, { a: null });
      const doc2 = doc('users/b', 1000, { a: NaN });
      const doc3 = doc('users/c', 1000, { a: 'abc' });
      const doc4 = doc('users/d', 1000, { b: null });
      const doc5 = doc('users/e', 1000, { b: NaN });
      const doc6 = doc('users/f', 1000, { b: 'abc' });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(orFunction(isNull(Field.of('a')), isNan(Field.of('b'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5, doc6])
      ).to.deep.equal([doc1, doc5]);
    });

    it('basicNotEqAny', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          notEqAny(Field.of('name'), [Constant.of('alice'), Constant.of('bob')])
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4, doc5]);
    });

    it('multipleNotEqAnys', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            notEqAny(Field.of('age'), [Constant.of(10), Constant.of(25)])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3]);
    });

    it('multipileNotEqAnys_withOr', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            notEqAny(Field.of('age'), [Constant.of(10), Constant.of(25)])
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc3, doc4, doc5]);
    });

    it('notEqAny_onCollectionGroup', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('other_users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('root/child/users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('root/child/other_users/e', 1000, {
        name: 'eric',
        age: 10
      });

      const pipeline = db
        .pipeline()
        .collectionGroup('users')
        .where(
          notEqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('bob'),
            Constant.of('diane')
          ])
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3]);
    });

    it('notEqAny_withSort', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          notEqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('diane')
          ])
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc5, doc2, doc3]);
    });

    it('notEqAny_withAdditionalEquality_differentFields', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc4, doc5]);
    });

    it('notEqAny_withAdditionalEquality_sameField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('diane')
            ]),
            eq(Field.of('name'), Constant.of('eric'))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc5]);
    });

    it('notEqAny_withInequalities_exclusiveRange', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('charlie')
            ]),
            gt(Field.of('age'), Constant.of(10)),
            lt(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2]);
    });

    it('notEqAny_withInequalities_inclusiveRange', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob'),
              Constant.of('eric')
            ]),
            gte(Field.of('age'), Constant.of(10)),
            lte(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4]);
    });

    it('notEqAny_withInequalitiesAndSort', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('diane')
            ]),
            gt(Field.of('age'), Constant.of(10)),
            lte(Field.of('age'), Constant.of(100))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc2, doc3]);
    });

    it('notEqAny_withNotEqual', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            neq(Field.of('age'), Constant.of(100))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc4, doc5]);
    });

    it('notEqAny_sortOnNotEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          notEqAny(Field.of('name'), [Constant.of('alice'), Constant.of('bob')])
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc3, doc4, doc5]);
    });

    it('notEqAny_singleValue_sortOnNotEqAnyField_ambiguousOrder', () => {
      const doc1 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc2 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc3 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(notEqAny(Field.of('age'), [Constant.of(100)]))
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.members([
        doc2,
        doc3
      ]);
    });

    it('notEqAny_withExtraEquality_sortOnNotEqAnyField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .sort(Field.of('name').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc4, doc5]);
    });

    it('notEqAny_withExtraEquality_sortOnEquality', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('bob')
            ]),
            eq(Field.of('age'), Constant.of(10))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.members([doc4, doc5]);
    });

    it('notEqAny_withInequality_onSameField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('age'), [Constant.of(10), Constant.of(100)]),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2, doc1]);
    });

    it('notEqAny_withDifferentInequality_sortOnInField', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });
      const doc4 = doc('users/d', 1000, { name: 'diane', age: 10 });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            notEqAny(Field.of('name'), [
              Constant.of('alice'),
              Constant.of('diane')
            ]),
            gt(Field.of('age'), Constant.of(20))
          )
        )
        .sort(Field.of('age').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.have.ordered.members([doc2, doc3]);
    });

    it('noLimitOnNumOfDisjunctions', () => {
      const doc1 = doc('users/a', 1000, {
        name: 'alice',
        age: 25,
        height: 170
      });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25, height: 180 });
      const doc3 = doc('users/c', 1000, {
        name: 'charlie',
        age: 100,
        height: 155
      });
      const doc4 = doc('users/d', 1000, {
        name: 'diane',
        age: 10,
        height: 150
      });
      const doc5 = doc('users/e', 1000, { name: 'eric', age: 25, height: 170 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            eq(Field.of('name'), Constant.of('alice')),
            eq(Field.of('name'), Constant.of('bob')),
            eq(Field.of('name'), Constant.of('charlie')),
            eq(Field.of('name'), Constant.of('diane')),
            eq(Field.of('age'), Constant.of(10)),
            eq(Field.of('age'), Constant.of(25)),
            eq(Field.of('age'), Constant.of(40)),
            eq(Field.of('age'), Constant.of(100)),
            eq(Field.of('height'), Constant.of(150)),
            eq(Field.of('height'), Constant.of(160)),
            eq(Field.of('height'), Constant.of(170)),
            eq(Field.of('height'), Constant.of(180))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4, doc5]);
    });

    it('eqAny_duplicateValues', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('score'), [
            Constant.of(50),
            Constant.of(97),
            Constant.of(97),
            Constant.of(97)
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc2,
        doc3
      ]);
    });

    it('notEqAny_duplicateValues', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          notEqAny(Field.of('score'), [
            Constant.of(50),
            Constant.of(50),
            Constant.of(true)
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc3
      ]);
    });

    it('arrayContainsAny_duplicateValues', () => {
      const doc1 = doc('users/a', 1000, { scores: [1, 2, 3] });
      const doc2 = doc('users/b', 1000, { scores: [4, 5, 6] });
      const doc3 = doc('users/c', 1000, { scores: [7, 8, 9] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          arrayContainsAny(Field.of('scores'), [
            Constant.of(1),
            Constant.of(2),
            Constant.of(2),
            Constant.of(2)
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('arrayContainsAll_duplicateValues', () => {
      const doc1 = doc('users/a', 1000, { scores: [1, 2, 3] });
      const doc2 = doc('users/b', 1000, { scores: [1, 2, 2, 2, 3] });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          arrayContainsAny(Field.of('scores'), [
            Constant.of(1),
            Constant.of(2),
            Constant.of(2),
            Constant.of(2),
            Constant.of(3)
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1, doc2]);
    });
  });

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
          orFunction(
            eq(Field.of('a'), true),
            eq(Field.of('b'), true),
            eq(Field.of('c'), true)
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
          andFunction(
            eq(Field.of('a'), true),
            eq(Field.of('b'), true),
            eq(Field.of('c'), true)
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
          xor(
            Field.of('a') as unknown as FilterExpr,
            Field.of('b') as unknown as FilterExpr,
            Field.of('c') as unknown as FilterExpr
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
        .where(not(Field.of('a') as unknown as FilterExpr));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('where_errorProducingFunction_returnsEmpty', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: true });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: '42' });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 0 });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          eq(divide(Constant.of('100'), Constant.of('50')), Constant.of(2))
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });
  });

  describe('Inequality Queries', () => {
    it('greaterThan', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gt(Field.of('score'), Constant.of(90)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
    });

    it('greaterThanOrEqual', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gte(Field.of('score'), Constant.of(90)));

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
        .where(lt(Field.of('score'), Constant.of(90)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
    });

    it('lessThanOrEqual', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(lte(Field.of('score'), Constant.of(90)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2
      ]);
    });

    it('notEqual', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(neq(Field.of('score'), Constant.of(90)));

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
        .where(neq(Field.of('score'), Constant.of(90)));

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
        .where(gt(Field.of('score'), Constant.of(42)));

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
        .where(not(gt(Field.of('score'), Constant.of(90))));

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
          andFunction(
            eq(Field.of('rank'), Constant.of(2)),
            gt(Field.of('score'), Constant.of(80))
          )
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
          andFunction(
            eq(Field.of('score'), Constant.of(90)),
            gt(Field.of('score'), Constant.of(80))
          )
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
        .where(gte(Field.of('score'), Constant.of(90)))
        .sort(Field.of('score').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3]
      );
    });

    it('withSort_onDifferentFields', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gte(Field.of('score'), Constant.of(90)))
        .sort(Field.of('rank').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1]
      );
    });

    it('withOr_onSingleField', () => {
      const doc1 = doc('users/bob', 1000, { score: 90 });
      const doc2 = doc('users/alice', 1000, { score: 50 });
      const doc3 = doc('users/charlie', 1000, { score: 97 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          orFunction(
            gt(Field.of('score'), Constant.of(90)),
            lt(Field.of('score'), Constant.of(60))
          )
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
          orFunction(
            gt(Field.of('score'), Constant.of(80)),
            lt(Field.of('rank'), Constant.of(2))
          )
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
          andFunction(
            gt(Field.of('score'), Constant.of(80)),
            eqAny(Field.of('score'), [
              Constant.of(50),
              Constant.of(80),
              Constant.of(97)
            ])
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
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            eqAny(Field.of('score'), [
              Constant.of(50),
              Constant.of(80),
              Constant.of(97)
            ])
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
          andFunction(
            gt(Field.of('score'), Constant.of(80)),
            notEqAny(Field.of('score'), [Constant.of(90), Constant.of(95)])
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
          notEqAny(Field.of('score'), [
            Constant.of('foo'),
            Constant.of(90),
            Constant.of(false)
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
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            notEqAny(Field.of('score'), [Constant.of(90), Constant.of(95)])
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
          andFunction(
            eq(Field.of('rank'), Constant.of(2)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').ascending(), Field.of('score').ascending());

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
          andFunction(
            eqAny(Field.of('rank'), [
              Constant.of(2),
              Constant.of(3),
              Constant.of(4)
            ]),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').ascending(), Field.of('score').ascending());

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
          andFunction(
            lte(Field.of('scores'), Constant.of([90, 90, 90])),
            gt(Field.of('rounds'), Constant.of([1, 2]))
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
          andFunction(
            lte(Field.of('scores'), Constant.of([90, 90, 90])),
            arrayContains(Field.of('rounds'), Constant.of(3))
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
        .where(gt(Field.of('score'), Constant.of(80)))
        .sort(Field.of('rank').ascending())
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
        .where(gt(Field.of('score'), Constant.of(80)))
        .sort(Field.of('rank').ascending())
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
          andFunction(
            gt(Field.of('score'), Constant.of(90)),
            lt(Field.of('score'), Constant.of(100))
          )
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
          andFunction(
            gt(Field.of('score'), Constant.of(90)),
            lt(Field.of('rank'), Constant.of(2))
          )
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
          andFunction(
            gt(Field.of('score'), Constant.of(80)),
            lt(Field.of('rank'), Constant.of(3))
          )
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
          andFunction(
            gt(Field.of('score'), Constant.of(40)),
            lt(Field.of('rank'), Constant.of(4))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2,
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
          andFunction(
            lt(Field.of('score'), Constant.of(90)),
            gt(Field.of('rank'), Constant.of(3))
          )
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
          andFunction(
            gt(Field.of('rank'), Constant.of(0)),
            lt(Field.of('rank'), Constant.of(4)),
            gt(Field.of('score'), Constant.of(80)),
            lt(Field.of('score'), Constant.of(95))
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
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1]
      );
    });

    it('multipleInequalities_withSingleSortDesc', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3]
      );
    });

    it('multipleInequalities_withMultipleSortAsc', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').ascending(), Field.of('score').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1]
      );
    });

    it('multipleInequalities_withMultipleSortDesc', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('rank').descending(), Field.of('score').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3]
      );
    });

    it('multipleInequalities_withMultipleSortDesc_onReverseIndex', () => {
      const doc1 = doc('users/bob', 1000, { score: 90, rank: 2 });
      const doc2 = doc('users/alice', 1000, { score: 50, rank: 3 });
      const doc3 = doc('users/charlie', 1000, { score: 97, rank: 1 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          andFunction(
            lt(Field.of('rank'), Constant.of(3)),
            gt(Field.of('score'), Constant.of(80))
          )
        )
        .sort(Field.of('score').descending(), Field.of('rank').descending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc1]
      );
    });
  });

  describe('Nested Properties', () => {
    it('where_equality_deeplyNested', () => {
      const doc1 = doc('users/a', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 42 } } } } } } } } }
        }
      });
      const doc2 = doc('users/b', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: '42' } } } } } } } } }
        }
      });
      const doc3 = doc('users/c', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 0 } } } } } } } } }
        }
      });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('a.b.c.d.e.f.g.h.i.j.k'), Constant.of(42)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('where_inequality_deeplyNested', () => {
      const doc1 = doc('users/a', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 42 } } } } } } } } }
        }
      });
      const doc2 = doc('users/b', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: '42' } } } } } } } } }
        }
      });
      const doc3 = doc('users/c', 1000, {
        a: {
          b: { c: { d: { e: { f: { g: { h: { i: { j: { k: 0 } } } } } } } } }
        }
      });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gte(Field.of('a.b.c.d.e.f.g.h.i.j.k'), Constant.of(0)))
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc3
      ]);
    });

    it('where_equality', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('address.street'), Constant.of('76')));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2
      ]);
    });

    it('multipleFilters', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('address.city'), Constant.of('San Francisco')))
        .where(gt(Field.of('address.zip'), Constant.of(90000)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1
      ]);
    });

    it('multipleFilters_redundant', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eq(
            Field.of('address'),
            Constant.of({ city: 'San Francisco', state: 'CA', zip: 94105 })
          )
        )
        .where(gt(Field.of('address.zip'), Constant.of(90000)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1
      ]);
    });

    it('multipleFilters_withCompositeIndex', async () => {
      // Assuming a similar setup for creating composite indexes in your environment.
      // This part will need adaptation based on your specific index creation mechanism.

      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('address.city'), Constant.of('San Francisco')))
        .where(gt(Field.of('address.zip'), Constant.of(90000)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1
      ]);
    });

    // it('multipleFilters_redundant_withCompositeIndex', async () => {
    //   const doc1 = doc('users/a', 1000, {
    //     address: { city: 'San Francisco', state: 'CA', zip: 94105 },
    //   });
    //   const doc2 = doc('users/b', 1000, {
    //     address: { street: '76', city: 'New York', state: 'NY', zip: 10011 },
    //   });
    //   const doc3 = doc('users/c', 1000, {
    //     address: { city: 'Mountain View', state: 'CA', zip: 94043 },
    //   });
    //   const doc4 = doc('users/d', 1000, {});
    //
    //   const pipeline = db.pipeline().collection('/users')
    //     .where(eq(Field.of('address'), Constant.of({ city: 'San Francisco', state: 'CA', zip: 94105 })))
    //     .where(gt(Field.of('address.zip'), Constant.of(90000)));
    //
    //   expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([doc1]);
    // });

    // it('multipleFilters_redundant_withCompositeIndex_nestedPropertyFirst', async () => {
    //   const doc1 = doc('users/a', 1000, {
    //     address: { city: 'San Francisco', state: 'CA', zip: 94105 },
    //   });
    //   const doc2 = doc('users/b', 1000, {
    //     address: { street: '76', city: 'New York', state: 'NY', zip: 10011 },
    //   });
    //   const doc3 = doc('users/c', 1000, {
    //     address: { city: 'Mountain View', state: 'CA', zip: 94043 },
    //   });
    //   const doc4 = doc('users/d', 1000, {});
    //
    //   const pipeline = db.pipeline().collection('/users')
    //     .where(eq(Field.of('address'), Constant.of({ city: 'San Francisco', state: 'CA', zip: 94105 })))
    //     .where(gt(Field.of('address.zip'), Constant.of(90000)));
    //
    //   expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([doc1]);
    // });

    it('where_inequality', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline1 = db
        .pipeline()
        .collection('/users')
        .where(gt(Field.of('address.zip'), Constant.of(90000)));
      expect(runPipeline(pipeline1, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1,
        doc3
      ]);

      const pipeline2 = db
        .pipeline()
        .collection('/users')
        .where(lt(Field.of('address.zip'), Constant.of(90000)));
      expect(runPipeline(pipeline2, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2
      ]);

      const pipeline3 = db
        .pipeline()
        .collection('/users')
        .where(lt(Field.of('address.zip'), Constant.of(0)));
      expect(runPipeline(pipeline3, [doc1, doc2, doc3, doc4])).to.be.empty;

      const pipeline4 = db
        .pipeline()
        .collection('/users')
        .where(neq(Field.of('address.zip'), Constant.of(10011)));
      expect(runPipeline(pipeline4, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1,
        doc3
      ]);
    });

    it('where_exists', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of('address.street')));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc2
      ]);
    });

    it('where_notExists', () => {
      const doc1 = doc('users/a', 1000, {
        address: { city: 'San Francisco', state: 'CA', zip: 94105 }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(not(exists(Field.of('address.street'))));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1,
        doc3,
        doc4
      ]);
    });

    it('where_isNull', () => {
      const doc1 = doc('users/a', 1000, {
        address: {
          city: 'San Francisco',
          state: 'CA',
          zip: 94105,
          street: null
        }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(Field.of('address.street').isNull());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('where_isNotNull', () => {
      const doc1 = doc('users/a', 1000, {
        address: {
          city: 'San Francisco',
          state: 'CA',
          zip: 94105,
          street: null
        }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(not(Field.of('address.street').isNull()));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc2,
        doc3
      ]);
    });

    it('sort_withExists', () => {
      const doc1 = doc('users/a', 1000, {
        address: {
          street: '41',
          city: 'San Francisco',
          state: 'CA',
          zip: 94105
        }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of('address.street')))
        .sort(Field.of('address.street').ascending());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4])
      ).to.have.ordered.members([doc1, doc2]);
    });

    it('sort_withoutExists', () => {
      const doc1 = doc('users/a', 1000, {
        address: {
          street: '41',
          city: 'San Francisco',
          state: 'CA',
          zip: 94105
        }
      });
      const doc2 = doc('users/b', 1000, {
        address: { street: '76', city: 'New York', state: 'NY', zip: 10011 }
      });
      const doc3 = doc('users/c', 1000, {
        address: { city: 'Mountain View', state: 'CA', zip: 94043 }
      });
      const doc4 = doc('users/d', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of('address.street').ascending());

      const results = runPipeline(pipeline, [doc1, doc2, doc3, doc4]);
      expect(results).to.have.lengthOf(4);
      expect(results[2]).to.deep.equal(doc1);
      expect(results[3]).to.deep.equal(doc2);
    });

    it('quotedNestedProperty_filterNested', () => {
      const doc1 = doc('users/a', 1000, { 'address.city': 'San Francisco' });
      const doc2 = doc('users/b', 1000, { address: { city: 'San Francisco' } });
      const doc3 = doc('users/c', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('address.city'), Constant.of('San Francisco')));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);
    });

    it('quotedNestedProperty_filterQuotedNested', () => {
      const doc1 = doc('users/a', 1000, { 'address.city': 'San Francisco' });
      const doc2 = doc('users/b', 1000, { address: { city: 'San Francisco' } });
      const doc3 = doc('users/c', 1000, {});

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('`address.city`'), Constant.of('San Francisco')));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });
  });

  describe('Null Semantics', () => {
    it('where_isNull', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: [null] });
      const doc3 = doc('users/c', 1000, { score: 42 });
      const doc4 = doc('users/d', 1000, { score: NaN });
      const doc5 = doc('users/e', 1000, { bar: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(Field.of('score').isNull());

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1]);
    });

    it('where_isNotNull', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: [null] });
      const doc3 = doc('users/c', 1000, { score: 42 });
      const doc4 = doc('users/d', 1000, { score: NaN });
      const doc5 = doc('users/e', 1000, { bar: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(not(isNull(Field.of('score'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc2, doc3, doc4, doc5]);
    });

    it('where_isNullAndIsNotNull_empty', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: [null] });
      const doc3 = doc('users/c', 1000, { score: 42 });
      const doc4 = doc('users/d', 1000, { bar: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          andFunction(
            Field.of('score').isNull(),
            not(Field.of('score').isNull())
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
    });

    it('where_eq_constantAsNull', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1]);
    });

    it('where_eq_fieldAsNull', () => {
      const doc1 = doc('users/a', 1000, { score: null, rank: null });
      const doc2 = doc('users/b', 1000, { score: 42, rank: 'abc' });
      const doc3 = doc('users/c', 1000, { score: 42 });
      const doc4 = doc('users/d', 1000, { rank: 'abc' });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Field.of('rank')));

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.deep.equal([
        doc1
      ]);
    });

    it('where_eq_segmentField', () => {
      const doc1 = doc('users/a', 1000, { score: { bonus: null } });
      const doc2 = doc('users/b', 1000, { score: { bonus: 42 } });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score.bonus'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1]);
    });

    it('where_eq_singleFieldAndSegmentField', () => {
      const doc1 = doc('users/a', 1000, { score: { bonus: null }, rank: null });
      const doc2 = doc('users/b', 1000, { score: { bonus: 42 }, rank: null });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          andFunction(
            eq(Field.of('score.bonus'), Constant.of(null)),
            eq(Field.of('rank'), Constant.of(null))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1]);
    });

    it('where_compositeCondition_withNull', () => {
      const doc1 = doc('users/a', 1000, { score: 42, rank: null });
      const doc2 = doc('users/b', 1000, { score: 42, rank: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          andFunction(
            eq(Field.of('score'), Constant.of(42)),
            eq(Field.of('rank'), Constant.of(null))
          )
        );

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc1]);
    });

    it('where_eqAny_nullOnly', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });
      const doc3 = doc('users/c', 1000, { rank: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eqAny(Field.of('score'), [Constant.of(null)]));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('where_neq_constantAsNull', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(neq(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc2]);
    });

    it('where_neq_fieldAsNull', () => {
      const doc1 = doc('users/a', 1000, { score: null, rank: null });
      const doc2 = doc('users/b', 1000, { score: 42, rank: null });

      const pipeline = db
        .pipeline()
        .database()
        .where(neq(Field.of('score'), Field.of('rank')));

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc2]);
    });

    it('where_notEqAny_withNull', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });

      const pipeline = db
        .pipeline()
        .database()
        .where(notEqAny(Field.of('score'), [Constant.of(null)]));

      expect(runPipeline(pipeline, [doc1, doc2])).to.deep.equal([doc2]);
    });

    it('where_gt', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });
      const doc3 = doc('users/c', 1000, { score: 'hello world' });

      const pipeline = db
        .pipeline()
        .database()
        .where(gt(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('where_gte', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });
      const doc3 = doc('users/c', 1000, { score: 'hello world' });

      const pipeline = db
        .pipeline()
        .database()
        .where(gte(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('where_lt', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });
      const doc3 = doc('users/c', 1000, { score: 'hello world' });

      const pipeline = db
        .pipeline()
        .database()
        .where(lt(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('where_lte', () => {
      const doc1 = doc('users/a', 1000, { score: null });
      const doc2 = doc('users/b', 1000, { score: 42 });
      const doc3 = doc('users/c', 1000, { score: 'hello world' });

      const pipeline = db
        .pipeline()
        .database()
        .where(lte(Field.of('score'), Constant.of(null)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });
  });

  describe('Number Semantics', () => {
    it('zero_negativeDoubleZero', () => {
      const doc1 = doc('users/a', 1000, { score: 0 });
      const doc2 = doc('users/b', 1000, { score: -0 });
      const doc3 = doc('users/c', 1000, { score: 0.0 });
      const doc4 = doc('users/d', 1000, { score: -0.0 });
      const doc5 = doc('users/e', 1000, { score: 1 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Constant.of(-0.0)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('zero_negativeIntegerZero', () => {
      const doc1 = doc('users/a', 1000, { score: 0 });
      const doc2 = doc('users/b', 1000, { score: -0 });
      const doc3 = doc('users/c', 1000, { score: 0.0 });
      const doc4 = doc('users/d', 1000, { score: -0.0 });
      const doc5 = doc('users/e', 1000, { score: 1 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Constant.of(-0)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('zero_positiveDoubleZero', () => {
      const doc1 = doc('users/a', 1000, { score: 0 });
      const doc2 = doc('users/b', 1000, { score: -0 });
      const doc3 = doc('users/c', 1000, { score: 0.0 });
      const doc4 = doc('users/d', 1000, { score: -0.0 });
      const doc5 = doc('users/e', 1000, { score: 1 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Constant.of(0.0)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('zero_positiveIntegerZero', () => {
      const doc1 = doc('users/a', 1000, { score: 0 });
      const doc2 = doc('users/b', 1000, { score: -0 });
      const doc3 = doc('users/c', 1000, { score: 0.0 });
      const doc4 = doc('users/d', 1000, { score: -0.0 });
      const doc5 = doc('users/e', 1000, { score: 1 });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('score'), Constant.of(0)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
    });

    it('equalNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('lessThanNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(lt(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('lessThanEqualNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: null });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(lte(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('greaterThanEqualNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gte(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('greaterThanNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 100 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(gt(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('notEqualNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(neq(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2,
        doc3
      ]);
    });

    it('eqAny_containsNan', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(
          eqAny(Field.of('name'), [Constant.of(NaN), Constant.of('alice')])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc1]);
    });

    it('eqAny_containsNanOnly_isEmpty', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eqAny(Field.of('age'), [Constant.of(NaN)]));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('arrayContains_nanOnly_isEmpty', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: NaN });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(arrayContains(Field.of('age'), Constant.of(NaN)));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('arrayContainsAny_withNaN', () => {
      const doc1 = doc('users/a', 1000, { field: [NaN] });
      const doc2 = doc('users/b', 1000, { field: [NaN, 42] });
      const doc3 = doc('users/c', 1000, { field: ['foo', 42] });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          arrayContainsAny(Field.of('field'), [
            Constant.of(NaN),
            Constant.of('foo')
          ])
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc3]);
    });

    it('notEqAny_containsNan', () => {
      const doc1 = doc('users/a', 1000, { age: 42 });
      const doc2 = doc('users/b', 1000, { age: NaN });
      const doc3 = doc('users/c', 1000, { age: 25 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(notEqAny(Field.of('age'), [Constant.of(NaN), Constant.of(42)]));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc2,
        doc3
      ]);
    });

    it('notEqAny_containsNanOnly_isEmpty', () => {
      const doc1 = doc('users/a', 1000, { age: 42 });
      const doc2 = doc('users/b', 1000, { age: NaN });
      const doc3 = doc('users/c', 1000, { age: 25 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(notEqAny(Field.of('age'), [Constant.of(NaN)]));

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([
        doc1,
        doc2,
        doc3
      ]);
    });

    it('array_withNan', () => {
      const doc1 = doc('k/a', 1000, { foo: [NaN] });
      const doc2 = doc('k/b', 1000, { foo: [42] });

      const pipeline = db
        .pipeline()
        .database()
        .where(eq(Field.of('foo'), Constant.of([NaN])));

      expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
    });

    // it('map_withNan', () => {
    //   const doc1 = doc('k/a', 1000, { foo: { a: NaN } });
    //   const doc2 = doc('k/b', 1000, { foo: { a: 42 } });
    //
    //   const pipeline = db.pipeline().database().where(eq(Field.of('foo'), Constant.of({ a: NaN })));
    //
    //   expect(runPipeline(pipeline, [doc1, doc2])).to.be.empty;
    // });
  });

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

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(0)
        .limit(0)
        .limit(0);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.be.empty;
    });

    it('limit_one', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db.pipeline().collection('/k').limit(1);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        1
      );
    });

    it('limit_one_duplicated', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(1)
        .limit(1)
        .limit(1);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        1
      );
    });

    it('limit_two', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db.pipeline().collection('/k').limit(2);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        2
      );
    });

    it('limit_two_duplicated', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(2)
        .limit(2)
        .limit(2);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        2
      );
    });

    it('limit_three', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db.pipeline().collection('/k').limit(3);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        3
      );
    });

    it('limit_three_duplicated', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(3)
        .limit(3)
        .limit(3);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        3
      );
    });

    it('limit_four', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db.pipeline().collection('/k').limit(4);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
    });

    it('limit_four_duplicated', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(4)
        .limit(4)
        .limit(4);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
    });

    it('limit_five', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db.pipeline().collection('/k').limit(5);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
    });

    it('limit_five_duplicated', () => {
      const doc1 = doc('k/a', 1000, { a: 1, b: 2 });
      const doc2 = doc('k/b', 1000, { a: 3, b: 4 });
      const doc3 = doc('k/c', 1000, { a: 5, b: 6 });
      const doc4 = doc('k/d', 1000, { a: 7, b: 8 });

      const pipeline = db
        .pipeline()
        .collection('/k')
        .limit(5)
        .limit(5)
        .limit(5);

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
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

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
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

      expect(runPipeline(pipeline, [doc1, doc2, doc3, doc4])).to.have.lengthOf(
        4
      );
    });
  });

  describe('Sort Tests', () => {
    it('empty_ascending', () => {
      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [])).to.be.empty;
    });

    it('empty_descending', () => {
      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of('age').descending());

      expect(runPipeline(pipeline, [])).to.be.empty;
    });

    it('singleResult_ascending', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
    });

    it('singleResult_ascending_explicitExists', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of('age')))
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
    });

    it('singleResult_ascending_explicitNotExists_empty', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(not(exists(Field.of('age'))))
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1])).to.be.empty;
    });

    it('singleResult_ascending_implicitExists', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('age'), Constant.of(10)))
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
    });

    it('singleResult_descending', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .sort(Field.of('age').descending());

      expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
    });

    it('singleResult_descending_explicitExists', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of('age')))
        .sort(Field.of('age').descending());

      expect(runPipeline(pipeline, [doc1])).to.deep.equal([doc1]);
    });

    it('singleResult_descending_implicitExists', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 10 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(eq(Field.of('age'), Constant.of(10)))
        .sort(Field.of('age').descending());

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
        .sort(Field.of('age').descending());

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
        .where(exists(Field.of('age')))
        .sort(Field.of('age').descending());

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
        .where(gt(Field.of('age'), Constant.of(0)))
        .sort(Field.of('age').descending());

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
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .where(exists(Field.of('age')))
        .where(exists(Field.of('name')))
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .where(not(exists(Field.of('age'))))
        .where(not(exists(Field.of('name'))))
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .where(eq(Field.of('age'), Field.of('age')))
        .where(regexMatch(Field.of('name'), Constant.of('.*')))
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .where(exists(Field.of('name')))
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .where(not(exists(Field.of('name'))))
        .sort(Field.of('age').descending(), Field.of('name').descending());

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
        .where(not(exists(Field.of('name'))))
        .sort(Field.of('name').descending(), Field.of('age').descending());

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
        .where(regexMatch(Field.of('name'), Constant.of('.*')))
        .sort(Field.of('age').descending(), Field.of('name').ascending());

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
        .sort(Field.of('not_age').descending());

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
        .where(exists(Field.of('not_age')))
        .sort(Field.of('not_age').descending());

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
        .sort(Field.of('age').ascending());

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
        .where(exists(Field.of('age')))
        .sort(Field.of('age').ascending());

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
        .where(not(exists(Field.of('age'))))
        .sort(Field.of('age').ascending());

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
        .sort(Field.of('age').ascending())
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
        .where(exists(Field.of('age')))
        .sort(Field.of('age').ascending())
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
        .where(not(exists(Field.of('age'))))
        .sort(Field.of('age').ascending())
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
        .sort(Field.of('age').ascending())
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
        .sort(Field.of('age').ascending());

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
        .where(exists(Field.of('age')))
        .limit(1)
        .sort(Field.of('age').ascending());

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
        .where(not(exists(Field.of('age'))))
        .limit(1)
        .sort(Field.of('age').ascending());

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
        .where(not(exists(Field.of('age'))))
        .sort(Field.of('age').ascending());

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
        .sort(Field.of('age').ascending());

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
        .sort(add(Field.of('age'), Constant.of(10)).descending());

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
        .where(exists(Field.of('age')))
        .sort(add(Field.of('age'), Constant.of(10)).descending());

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
        .where(not(exists(Field.of('age'))))
        .sort(add(Field.of('age'), Constant.of(10)).descending());

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
        .where(exists(Field.of(DOCUMENT_KEY_NAME)))
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('sortOnOtherFieldAndPath_onDifferentStages', () => {
      const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
      const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
      const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of(DOCUMENT_KEY_NAME)))
        .sort(Field.of('age').ascending())
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc2, doc3]
      );
    });

    it('sortOnKeyAndOtherField_onMultipleStages', () => {
      const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
      const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
      const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of(DOCUMENT_KEY_NAME)))
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending())
        .sort(Field.of('age').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1, doc3]
      );
    });

    it('sortOnOtherFieldAndKey_onMultipleStages', () => {
      const doc1 = doc('users/1', 1000, { name: 'alice', age: 40 });
      const doc2 = doc('users/2', 1000, { name: 'bob', age: 30 });
      const doc3 = doc('users/3', 1000, { name: 'charlie', age: 50 });

      const pipeline = db
        .pipeline()
        .collection('/users')
        .where(exists(Field.of(DOCUMENT_KEY_NAME)))
        .sort(Field.of('age').ascending())
        .sort(Field.of(DOCUMENT_KEY_NAME).ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc2, doc3]
      );
    });
  });

  describe('Unicode Tests', () => {
    it('basicUnicode', () => {
      const doc1 = doc('🐵/Łukasiewicz', 1000, { Ł: 'Jan Łukasiewicz' });
      const doc2 = doc('🐵/Sierpiński', 1000, { Ł: 'Wacław Sierpiński' });
      const doc3 = doc('🐵/iwasawa', 1000, { Ł: '岩澤' });

      const pipeline = db
        .pipeline()
        .collection('/🐵')
        .sort(Field.of('`Ł`').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc2, doc3]
      );
    });

    // TODO(pipeline): SDK's surrogates ordering has always been incompatible with
    // backends, which comes from ICU4J. We need to replicate the semantics of that.
    // Skipping below tests until then.
    it.skip('unicodeSurrogates', () => {
      const doc1 = doc('users/a', 1000, { str: '🄟' });
      const doc2 = doc('users/b', 1000, { str: 'Ｐ' });
      const doc3 = doc('users/c', 1000, { str: '︒' });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          andFunction(
            lte(Field.of('str'), Constant.of('🄟')),
            gte(Field.of('str'), Constant.of('Ｐ'))
          )
        )
        .sort(Field.of('str').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc2, doc1]
      );
    });

    it.skip('unicodeSurrogatesInArray', () => {
      const doc1 = doc('users/a', 1000, { foo: ['🄟'] });
      const doc2 = doc('users/b', 1000, { foo: ['Ｐ'] });
      const doc3 = doc('users/c', 1000, { foo: ['︒'] });

      const pipeline = db
        .pipeline()
        .database()
        .sort(Field.of('foo').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc3, doc2, doc1]
      );
    });

    it.skip('unicodeSurrogatesInMapKeys', () => {
      const doc1 = doc('users/a', 1000, { map: { '︒': true, z: true } });
      const doc2 = doc('users/b', 1000, { map: { '🄟': true, '︒': true } });
      const doc3 = doc('users/c', 1000, { map: { 'Ｐ': true, '︒': true } });

      const pipeline = db
        .pipeline()
        .database()
        .sort(Field.of('map').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3, doc2]
      );
    });

    it.skip('unicodeSurrogatesInMapValues', () => {
      const doc1 = doc('users/a', 1000, { map: { foo: '︒' } });
      const doc2 = doc('users/b', 1000, { map: { foo: '🄟' } });
      const doc3 = doc('users/c', 1000, { map: { foo: 'Ｐ' } });

      const pipeline = db
        .pipeline()
        .database()
        .sort(Field.of('map').ascending());

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.have.ordered.members(
        [doc1, doc3, doc2]
      );
    });
  });

  describe('Where Stage', () => {
    it('emptyDatabase_returnsNoResults', () => {
      expect(
        runPipeline(
          db
            .pipeline()
            .database()
            .where(gte(Field.of('age'), Constant.of(10))),
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
          andFunction(
            gte(Field.of('age'), Constant.of(10)),
            gte(Field.of('age'), Constant.of(20))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3]);
    });

    it('logicalEquivalentCondition_equal', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: 75.5 });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: 25 });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 100 });

      const pipeline1 = db
        .pipeline()
        .database()
        .where(eq(Field.of('age'), Constant.of(25)));
      const pipeline2 = db
        .pipeline()
        .database()
        .where(eq(Constant.of(25), Field.of('age')));

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
          andFunction(
            gt(Field.of('age'), Constant.of(10)),
            lt(Field.of('age'), Constant.of(70))
          )
        );
      const pipeline2 = db
        .pipeline()
        .database()
        .where(
          andFunction(
            lt(Field.of('age'), Constant.of(70)),
            gt(Field.of('age'), Constant.of(10))
          )
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
          orFunction(
            lt(Field.of('age'), Constant.of(10)),
            gt(Field.of('age'), Constant.of(80))
          )
        );
      const pipeline2 = db
        .pipeline()
        .database()
        .where(
          orFunction(
            gt(Field.of('age'), Constant.of(80)),
            lt(Field.of('age'), Constant.of(10))
          )
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
          eqAny(Field.of('name'), [
            Constant.of('alice'),
            Constant.of('matthew'),
            Constant.of('joe')
          ])
        );
      const pipeline2 = db
        .pipeline()
        .database()
        .where(
          arrayContainsAny(Constant.of(['alice', 'matthew', 'joe']), [
            Field.of('name')
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
        .where(gte(Field.of('age'), Constant.of(10)))
        .where(gte(Field.of('age'), Constant.of(20)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3]);
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
        .where(eq(Field.of('age'), Constant.of(75)))
        .where(eq(Field.of('height'), Constant.of(55)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3]);
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
        .where(gt(Field.of('age'), Constant.of(50)))
        .where(lt(Field.of('height'), Constant.of(75)));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc3]);
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
        .where(like(Field.of('first'), Constant.of('%a%')))
        .where(like(Field.of('last'), Constant.of('%er')));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4]);
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
        .where(eq(Field.of('age'), Constant.of(75)))
        .where(gt(Field.of('height'), Constant.of(45)))
        .where(like(Field.of('last'), Constant.of('%er')));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4]);
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
        .where(exists(Field.of('name')));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3]);
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
        .where(not(exists(Field.of('name'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc4, doc5]);
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
        .where(not(not(exists(Field.of('name')))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3]);
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
        .where(andFunction(exists(Field.of('name')), exists(Field.of('age'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2]);
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
        .where(orFunction(exists(Field.of('name')), exists(Field.of('age'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc3, doc4]);
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
        .where(
          not(andFunction(exists(Field.of('name')), exists(Field.of('age'))))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4, doc5]);
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
        .where(
          not(orFunction(exists(Field.of('name')), exists(Field.of('age'))))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc5]);
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
        .where(not(xor(exists(Field.of('name')), exists(Field.of('age')))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc5]);
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
        .where(
          andFunction(
            not(exists(Field.of('name'))),
            not(exists(Field.of('age')))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc5]);
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
        .where(
          orFunction(
            not(exists(Field.of('name'))),
            not(exists(Field.of('age')))
          )
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4, doc5]);
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
        .where(
          xor(not(exists(Field.of('name'))), not(exists(Field.of('age'))))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc3, doc4]);
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
        .where(
          andFunction(not(exists(Field.of('name'))), exists(Field.of('age')))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc4]);
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
        .where(
          orFunction(not(exists(Field.of('name'))), exists(Field.of('age')))
        );

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc4, doc5]);
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
        .where(xor(not(exists(Field.of('name'))), exists(Field.of('age'))));

      expect(
        runPipeline(pipeline, [doc1, doc2, doc3, doc4, doc5])
      ).to.deep.equal([doc1, doc2, doc5]);
    });

    it('whereExpressionIsNotBooleanYielding', () => {
      const doc1 = doc('users/a', 1000, { name: 'alice', age: true });
      const doc2 = doc('users/b', 1000, { name: 'bob', age: '42' });
      const doc3 = doc('users/c', 1000, { name: 'charlie', age: 0 });

      const pipeline = db
        .pipeline()
        .database()
        .where(
          divide(Constant.of('100'), Constant.of('50')) as unknown as FilterExpr
        );

      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.be.empty;
    });

    it('andExpression_logicallyEquivalent_toSeparatedStages', () => {
      const doc1 = doc('users/a', 1000, { a: 1, b: 1 });
      const doc2 = doc('users/b', 1000, { a: 1, b: 2 });
      const doc3 = doc('users/c', 1000, { a: 2, b: 2 });

      const equalityArgument1 = eq(Field.of('a'), Constant.of(1));
      const equalityArgument2 = eq(Field.of('b'), Constant.of(2));

      let pipeline = db
        .pipeline()
        .database()
        .where(andFunction(equalityArgument1, equalityArgument2));
      expect(runPipeline(pipeline, [doc1, doc2, doc3])).to.deep.equal([doc2]);

      pipeline = db
        .pipeline()
        .database()
        .where(andFunction(equalityArgument2, equalityArgument1));
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
});
