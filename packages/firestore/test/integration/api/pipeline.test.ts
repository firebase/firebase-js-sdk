// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import {
  add,
  andExpression,
  arrayContains,
  arrayContainsAny,
  avg,
  CollectionReference,
  Constant,
  cosineDistance,
  countAll,
  doc,
  DocumentData,
  dotProduct,
  endsWith,
  eq,
  euclideanDistance,
  Field,
  Firestore,
  gt,
  like,
  lt,
  lte,
  mapGet,
  neq,
  not,
  orExpression,
  PipelineResult,
  regexContains,
  regexMatch,
  setDoc,
  startsWith,
  subtract
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';

use(chaiAsPromised);

apiDescribe.only('Pipelines', persistence => {
  addEqualityMatcher();
  let firestore: Firestore;
  let randomCol: CollectionReference;

  // async function addDocs(
  //   ...docs: DocumentData[]
  // ): Promise<DocumentReference[]> {
  //   let id = 0; // Guarantees consistent ordering for the first documents
  //   const refs: DocumentReference[] = [];
  //   for (const data of docs) {
  //     const ref = doc(randomCol, 'doc' + id++);
  //     await setDoc(ref, data);
  //     refs.push(ref);
  //   }
  //   return refs;
  // }

  async function testCollectionWithDocs(docs: {
    [id: string]: DocumentData;
  }): Promise<CollectionReference<DocumentData>> {
    for (const id in docs) {
      if (docs.hasOwnProperty(id)) {
        const ref = doc(randomCol, id);
        await setDoc(ref, docs[id]);
      }
    }
    return randomCol;
  }

  function expectResults<AppModelType>(
    result: Array<PipelineResult<AppModelType>>,
    ...docs: string[]
  ): void;
  function expectResults<AppModelType>(
    result: Array<PipelineResult<AppModelType>>,
    ...data: DocumentData[]
  ): void;

  function expectResults<AppModelType>(
    result: Array<PipelineResult<AppModelType>>,
    ...data: DocumentData[] | string[]
  ): void {
    expect(result.length).to.equal(data.length);

    if (data.length > 0) {
      if (typeof data[0] === 'string') {
        const actualIds = result.map(result => result.ref?.id);
        expect(actualIds).to.deep.equal(data);
      } else {
        result.forEach(r => {
          expect(r.data()).to.deep.equal(data.shift());
        });
      }
    }
  }

  // async function compareQueryAndPipeline(query: Query): Promise<QuerySnapshot> {
  //   const queryResults = await getDocs(query);
  //   const pipeline = query.pipeline();
  //   const pipelineResults = await pipeline.execute();
  //
  //   expect(queryResults.docs.map(s => s._fieldsProto)).to.deep.equal(
  //     pipelineResults.map(r => r._fieldsProto)
  //   );
  //   return queryResults;
  // }

  async function setupBookDocs(): Promise<CollectionReference<DocumentData>> {
    const bookDocs: { [id: string]: DocumentData } = {
      book1: {
        title: "The Hitchhiker's Guide to the Galaxy",
        author: 'Douglas Adams',
        genre: 'Science Fiction',
        published: 1979,
        rating: 4.2,
        tags: ['comedy', 'space', 'adventure'],
        awards: {
          hugo: true,
          nebula: false,
          others: { unknown: { year: 1980 } }
        },
        nestedField: { 'level.1': { 'level.2': true } }
      },
      book2: {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        genre: 'Romance',
        published: 1813,
        rating: 4.5,
        tags: ['classic', 'social commentary', 'love'],
        awards: { none: true }
      },
      book3: {
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        genre: 'Magical Realism',
        published: 1967,
        rating: 4.3,
        tags: ['family', 'history', 'fantasy'],
        awards: { nobel: true, nebula: false }
      },
      book4: {
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        genre: 'Fantasy',
        published: 1954,
        rating: 4.7,
        tags: ['adventure', 'magic', 'epic'],
        awards: { hugo: false, nebula: false }
      },
      book5: {
        title: "The Handmaid's Tale",
        author: 'Margaret Atwood',
        genre: 'Dystopian',
        published: 1985,
        rating: 4.1,
        tags: ['feminism', 'totalitarianism', 'resistance'],
        awards: { 'arthur c. clarke': true, 'booker prize': false }
      },
      book6: {
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        genre: 'Psychological Thriller',
        published: 1866,
        rating: 4.3,
        tags: ['philosophy', 'crime', 'redemption'],
        awards: { none: true }
      },
      book7: {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        genre: 'Southern Gothic',
        published: 1960,
        rating: 4.2,
        tags: ['racism', 'injustice', 'coming-of-age'],
        awards: { pulitzer: true }
      },
      book8: {
        title: '1984',
        author: 'George Orwell',
        genre: 'Dystopian',
        published: 1949,
        rating: 4.2,
        tags: ['surveillance', 'totalitarianism', 'propaganda'],
        awards: { prometheus: true }
      },
      book9: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        genre: 'Modernist',
        published: 1925,
        rating: 4.0,
        tags: ['wealth', 'american dream', 'love'],
        awards: { none: true }
      },
      book10: {
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Science Fiction',
        published: 1965,
        rating: 4.6,
        tags: ['politics', 'desert', 'ecology'],
        awards: { hugo: true, nebula: true }
      }
    };
    return testCollectionWithDocs(bookDocs);
  }

  let testDeferred: Deferred<void> | undefined;
  let withTestCollectionPromise: Promise<unknown> | undefined;

  beforeEach(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(
      persistence,
      {},
      async (collectionRef, firestoreInstance) => {
        randomCol = collectionRef;
        firestore = firestoreInstance;
        await setupBookDocs();
        setupDeferred.resolve();

        return testDeferred?.promise;
      }
    );

    await setupDeferred.promise;
  });

  afterEach(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  // setLogLevel('debug')

  it('empty results as expected', async () => {
    const result = await firestore
      .pipeline()
      .collection(randomCol.path)
      .limit(0)
      .execute();
    expect(result.length).to.equal(0);
  });

  it('full results as expected', async () => {
    const result = await firestore
      .pipeline()
      .collection(randomCol.path)
      .execute();
    expect(result.length).to.equal(10);
  });

  it('returns aggregate results as expected', async () => {
    let result = await firestore
      .pipeline()
      .collection(randomCol.path)
      .aggregate(countAll().as('count'))
      .execute();
    expectResults(result, { count: 10 });

    result = await randomCol
      .pipeline()
      .where(eq('genre', 'Science Fiction'))
      .aggregate(
        countAll().as('count'),
        avg('rating').as('avgRating'),
        Field.of('rating').max().as('maxRating')
      )
      .execute();
    expectResults(result, { count: 2, avgRating: 4.4, maxRating: 4.6 });
  });

  it('rejects groups without accumulators', async () => {
    await expect(
      randomCol
        .pipeline()
        .where(lt('published', 1900))
        .aggregate({
          accumulators: [],
          groups: ['genre']
        })
        .execute()
    ).to.be.rejected;
  });

  // skip: toLower not supported
  // it.skip('returns distinct values as expected', async () => {
  //   const results = await randomCol
  //     .pipeline()
  //     .where(lt('published', 1900))
  //     .distinct(Field.of('genre').toLower().as('lowerGenre'))
  //     .execute();
  //   expectResults(
  //     results,
  //     { lowerGenre: 'romance' },
  //     { lowerGenre: 'psychological thriller' }
  //   );
  // });

  it('returns group and accumulate results', async () => {
    const results = await randomCol
      .pipeline()
      .where(lt(Field.of('published'), 1984))
      .aggregate({
        accumulators: [avg('rating').as('avgRating')],
        groups: ['genre']
      })
      .where(gt('avgRating', 4.3))
      .sort(Field.of('avgRating').descending())
      .execute();
    expectResults(
      results,
      { avgRating: 4.7, genre: 'Fantasy' },
      { avgRating: 4.5, genre: 'Romance' },
      { avgRating: 4.4, genre: 'Science Fiction' }
    );
  });

  it('returns min and max accumulations', async () => {
    const results = await randomCol
      .pipeline()
      .aggregate(
        countAll().as('count'),
        Field.of('rating').max().as('maxRating'),
        Field.of('published').min().as('minPublished')
      )
      .execute();
    expectResults(results, {
      count: 10,
      maxRating: 4.7,
      minPublished: 1813
    });
  });

  it('can select fields', async () => {
    const results = await firestore
      .pipeline()
      .collection(randomCol.path)
      .select('title', 'author')
      .sort(Field.of('author').ascending())
      .execute();
    expectResults(
      results,
      {
        title: "The Hitchhiker's Guide to the Galaxy",
        author: 'Douglas Adams'
      },
      { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald' },
      { title: 'Dune', author: 'Frank Herbert' },
      { title: 'Crime and Punishment', author: 'Fyodor Dostoevsky' },
      {
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez'
      },
      { title: '1984', author: 'George Orwell' },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
      { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' },
      { title: 'Pride and Prejudice', author: 'Jane Austen' },
      { title: "The Handmaid's Tale", author: 'Margaret Atwood' }
    );
  });

  it('where with and', async () => {
    const results = await randomCol
      .pipeline()
      .where(andExpression(gt('rating', 4.5), eq('genre', 'Science Fiction')))
      .execute();
    expectResults(results, 'book10');
  });

  it('where with or', async () => {
    const results = await randomCol
      .pipeline()
      .where(orExpression(eq('genre', 'Romance'), eq('genre', 'Dystopian')))
      .select('title')
      .execute();
    expectResults(
      results,
      { title: 'Pride and Prejudice' },
      { title: "The Handmaid's Tale" },
      { title: '1984' }
    );
  });

  it('offset and limits', async () => {
    const results = await firestore
      .pipeline()
      .collection(randomCol.path)
      .sort(Field.of('author').ascending())
      .offset(5)
      .limit(3)
      .select('title', 'author')
      .execute();
    expectResults(
      results,
      { title: '1984', author: 'George Orwell' },
      { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
      { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' }
    );
  });

  it('arrayContains works', async () => {
    const results = await randomCol
      .pipeline()
      .where(arrayContains('tags', 'comedy'))
      .select('title')
      .execute();
    expectResults(results, { title: "The Hitchhiker's Guide to the Galaxy" });
  });

  it('arrayContainsAny works', async () => {
    const results = await randomCol
      .pipeline()
      .where(arrayContainsAny('tags', ['comedy', 'classic']))
      .select('title')
      .execute();
    expectResults(
      results,
      { title: "The Hitchhiker's Guide to the Galaxy" },
      { title: 'Pride and Prejudice' }
    );
  });

  it('arrayContainsAll works', async () => {
    const results = await randomCol
      .pipeline()
      .where(Field.of('tags').arrayContainsAll('adventure', 'magic'))
      .select('title')
      .execute();
    expectResults(results, { title: 'The Lord of the Rings' });
  });

  it('arrayLength works', async () => {
    const results = await randomCol
      .pipeline()
      .select(Field.of('tags').arrayLength().as('tagsCount'))
      .where(eq('tagsCount', 3))
      .execute();
    expect(results.length).to.equal(10);
  });

  // skip: arrayConcat not supported
  // it.skip('arrayConcat works', async () => {
  //   const results = await randomCol
  //     .pipeline()
  //     .select(
  //       Field.of('tags').arrayConcat(['newTag1', 'newTag2']).as('modifiedTags')
  //     )
  //     .limit(1)
  //     .execute();
  //   expectResults(results, {
  //     modifiedTags: ['comedy', 'space', 'adventure', 'newTag1', 'newTag2']
  //   });
  // });

  it('testStrConcat', async () => {
    const results = await randomCol
      .pipeline()
      .select(
        Field.of('author').strConcat(' - ', Field.of('title')).as('bookInfo')
      )
      .limit(1)
      .execute();
    expectResults(results, {
      bookInfo: "Douglas Adams - The Hitchhiker's Guide to the Galaxy"
    });
  });

  it('testStartsWith', async () => {
    const results = await randomCol
      .pipeline()
      .where(startsWith('title', 'The'))
      .select('title')
      .sort(Field.of('title').ascending())
      .execute();
    expectResults(
      results,
      { title: 'The Great Gatsby' },
      { title: "The Handmaid's Tale" },
      { title: "The Hitchhiker's Guide to the Galaxy" },
      { title: 'The Lord of the Rings' }
    );
  });

  it('testEndsWith', async () => {
    const results = await randomCol
      .pipeline()
      .where(endsWith('title', 'y'))
      .select('title')
      .sort(Field.of('title').descending())
      .execute();
    expectResults(
      results,
      { title: "The Hitchhiker's Guide to the Galaxy" },
      { title: 'The Great Gatsby' }
    );
  });

  it('testLength', async () => {
    const results = await randomCol
      .pipeline()
      .select(
        Field.of('title').charLength().as('titleLength'),
        Field.of('title')
      )
      .where(gt('titleLength', 20))
      .sort(Field.of('title').ascending())
      .execute();

    expectResults(
      results,

      {
        titleLength: 29,
        title: 'One Hundred Years of Solitude'
      },
      {
        titleLength: 36,
        title: "The Hitchhiker's Guide to the Galaxy"
      },
      {
        titleLength: 21,
        title: 'The Lord of the Rings'
      },
      {
        titleLength: 21,
        title: 'To Kill a Mockingbird'
      }
    );
  });

  // skip: toLower not supported
  // it.skip('testToLowercase', async () => {
  //   const results = await randomCol
  //     .pipeline()
  //     .select(Field.of('title').toLower().as('lowercaseTitle'))
  //     .limit(1)
  //     .execute();
  //   expectResults(results, {
  //     lowercaseTitle: "the hitchhiker's guide to the galaxy"
  //   });
  // });

  // skip: toUpper not supported
  // it.skip('testToUppercase', async () => {
  //   const results = await randomCol
  //     .pipeline()
  //     .select(Field.of('author').toUpper().as('uppercaseAuthor'))
  //     .limit(1)
  //     .execute();
  //   expectResults(results, { uppercaseAuthor: 'DOUGLAS ADAMS' });
  // });

  // skip: trim not supported
  // it.skip('testTrim', async () => {
  //   const results = await randomCol
  //     .pipeline()
  //     .addFields(strConcat(' ', Field.of('title'), ' ').as('spacedTitle'))
  //     .select(
  //       Field.of('spacedTitle').trim().as('trimmedTitle'),
  //       Field.of('spacedTitle')
  //     )
  //     .limit(1)
  //     .execute();
  //   expectResults(results, {
  //     spacedTitle: " The Hitchhiker's Guide to the Galaxy ",
  //     trimmedTitle: "The Hitchhiker's Guide to the Galaxy"
  //   });
  // });

  it('testLike', async () => {
    const results = await randomCol
      .pipeline()
      .where(like('title', '%Guide%'))
      .select('title')
      .execute();
    expectResults(results, { title: "The Hitchhiker's Guide to the Galaxy" });
  });

  it('testRegexContains', async () => {
    const results = await randomCol
      .pipeline()
      .where(regexContains('title', '(?i)(the|of)'))
      .execute();
    expect(results.length).to.equal(5);
  });

  it('testRegexMatches', async () => {
    const results = await randomCol
      .pipeline()
      .where(regexMatch('title', '.*(?i)(the|of).*'))
      .execute();
    expect(results.length).to.equal(5);
  });

  it('testArithmeticOperations', async () => {
    const results = await randomCol
      .pipeline()
      .select(
        add(Field.of('rating'), 1).as('ratingPlusOne'),
        subtract(Field.of('published'), 1900).as('yearsSince1900'),
        Field.of('rating').multiply(10).as('ratingTimesTen'),
        Field.of('rating').divide(2).as('ratingDividedByTwo')
      )
      .limit(1)
      .execute();
    expectResults(results, {
      ratingPlusOne: 5.2,
      yearsSince1900: 79,
      ratingTimesTen: 42,
      ratingDividedByTwo: 2.1
    });
  });

  it('testComparisonOperators', async () => {
    const results = await randomCol
      .pipeline()
      .where(
        andExpression(
          gt('rating', 4.2),
          lte(Field.of('rating'), 4.5),
          neq('genre', 'Science Fiction')
        )
      )
      .select('rating', 'title')
      .sort(Field.of('title').ascending())
      .execute();
    expectResults(
      results,
      { rating: 4.3, title: 'Crime and Punishment' },
      {
        rating: 4.3,
        title: 'One Hundred Years of Solitude'
      },
      { rating: 4.5, title: 'Pride and Prejudice' }
    );
  });

  it('testLogicalOperators', async () => {
    const results = await randomCol
      .pipeline()
      .where(
        orExpression(
          andExpression(gt('rating', 4.5), eq('genre', 'Science Fiction')),
          lt('published', 1900)
        )
      )
      .select('title')
      .sort(Field.of('title').ascending())
      .execute();
    expectResults(
      results,
      { title: 'Crime and Punishment' },
      { title: 'Dune' },
      { title: 'Pride and Prejudice' }
    );
  });

  it('testChecks', async () => {
    const results = await randomCol
      .pipeline()
      .where(not(Field.of('rating').isNaN()))
      .select(
        Field.of('rating').eq(null).as('ratingIsNull'),
        not(Field.of('rating').isNaN()).as('ratingIsNotNaN')
      )
      .limit(1)
      .execute();
    expectResults(results, { ratingIsNull: false, ratingIsNotNaN: true });
  });

  it('testMapGet', async () => {
    const results = await randomCol
      .pipeline()
      .select(
        Field.of('awards').mapGet('hugo').as('hugoAward'),
        Field.of('awards').mapGet('others').as('others'),
        Field.of('title')
      )
      .where(eq('hugoAward', true))
      .execute();
    expectResults(
      results,
      {
        hugoAward: true,
        title: "The Hitchhiker's Guide to the Galaxy",
        others: { unknown: { year: 1980 } }
      },
      { hugoAward: true, title: 'Dune', others: null }
    );
  });

  // it('testParent', async () => {
  //   const results = await randomCol
  //       .pipeline()
  //       .select(
  //           parent(randomCol.doc('chile').collection('subCollection').path).as(
  //               'parent'
  //           )
  //       )
  //       .limit(1)
  //       .execute();
  //   expect(results[0].data().parent.endsWith('/books')).to.be.true;
  // });
  //
  // it('testCollectionId', async () => {
  //   const results = await randomCol
  //       .pipeline()
  //       .select(collectionId(randomCol.doc('chile')).as('collectionId'))
  //       .limit(1)
  //       .execute();
  //   expectResults(results, {collectionId: 'books'});
  // });

  it('testDistanceFunctions', async () => {
    const sourceVector = [0.1, 0.1];
    const targetVector = [0.5, 0.8];
    const results = await randomCol
      .pipeline()
      .select(
        cosineDistance(Constant.vector(sourceVector), targetVector).as(
          'cosineDistance'
        ),
        dotProduct(Constant.vector(sourceVector), targetVector).as(
          'dotProductDistance'
        ),
        euclideanDistance(Constant.vector(sourceVector), targetVector).as(
          'euclideanDistance'
        )
      )
      .limit(1)
      .execute();

    expectResults(results, {
      cosineDistance: 0.02560880430538015,
      dotProductDistance: 0.13,
      euclideanDistance: 0.806225774829855
    });
  });

  it('testNestedFields', async () => {
    const results = await randomCol
      .pipeline()
      .where(eq('awards.hugo', true))
      .select('title', 'awards.hugo')
      .execute();
    expectResults(
      results,
      { title: "The Hitchhiker's Guide to the Galaxy", 'awards.hugo': true },
      { title: 'Dune', 'awards.hugo': true }
    );
  });

  it('test mapGet with field name including . notation', async () => {
    const results = await randomCol
      .pipeline()
      .where(eq('awards.hugo', true))
      .select(
        'title',
        Field.of('nestedField.level.1'),
        mapGet('nestedField', 'level.1').mapGet('level.2').as('nested')
      )
      .execute();
    expectResults(
      results,
      {
        title: "The Hitchhiker's Guide to the Galaxy",
        'nestedField.level.`1`': null,
        nested: true
      },
      { title: 'Dune', 'nestedField.level.`1`': null, nested: null }
    );
  });

  // TODO(pipeline) support converter
  // it('pipeline converter works', async () => {
  //   interface AppModel {myTitle: string; myAuthor: string; myPublished: number}
  //   const converter: FirestorePipelineConverter<AppModel> = {
  //     fromFirestore(result: FirebaseFirestore.PipelineResult): AppModel {
  //       return {
  //         myTitle: result.data()!.title as string,
  //         myAuthor: result.data()!.author as string,
  //         myPublished: result.data()!.published as number,
  //       };
  //     },
  //   };
  //
  //   const results = await firestore
  //     .pipeline()
  //     .collection(randomCol.path)
  //     .sort(Field.of('published').ascending())
  //     .limit(2)
  //     .withConverter(converter)
  //     .execute();
  //
  //   const objs = results.map(r => r.data());
  //   expect(objs[0]).to.deep.equal({
  //     myAuthor: 'Jane Austen',
  //     myPublished: 1813,
  //     myTitle: 'Pride and Prejudice',
  //   });
  //   expect(objs[1]).to.deep.equal({
  //     myAuthor: 'Fyodor Dostoevsky',
  //     myPublished: 1866,
  //     myTitle: 'Crime and Punishment',
  //   });
  // });
});
