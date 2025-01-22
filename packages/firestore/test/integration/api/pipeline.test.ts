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

import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import {
  pipeline,
  execute,
  _internalPipelineToExecutePipelineRequestProto,
  add,
  andFunction,
  arrayContains,
  arrayContainsAny,
  avgFunction,
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
  orFunction,
  PipelineResult,
  regexContains,
  regexMatch,
  setDoc,
  startsWith,
  subtract,
  setLogLevel,
  cond,
  eqAny,
  logicalMaximum,
  logicalMinimum,
  notEqAny,
  query,
  where,
  FieldPath,
  orderBy,
  limit,
  limitToLast,
  startAt,
  startAfter,
  endAt,
  endBefore,
  collectionGroup,
  collection,
  and,
  documentId,
  addDoc,
  getDoc
} from '../util/firebase_export';
import {
  apiDescribe,
  PERSISTENCE_MODE_UNSPECIFIED,
  withTestCollection
} from '../util/helpers';

use(chaiAsPromised);

setLogLevel('debug');

apiDescribe.only('Pipelines', persistence => {
  addEqualityMatcher();

  describe('books tests', () => {
    let firestore: Firestore;
    let randomCol: CollectionReference;

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

    describe('fluent API', () => {
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
            avgFunction('rating').as('avgRating'),
            Field.of('rating').maximum().as('maxRating')
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

      it('returns distinct values as expected', async () => {
        const results = await randomCol
          .pipeline()
          .distinct('genre', 'author')
          .sort(Field.of('genre').ascending(), Field.of('author').ascending())
          .execute();
        expectResults(
          results,
          { genre: 'Dystopian', author: 'George Orwell' },
          { genre: 'Dystopian', author: 'Margaret Atwood' },
          { genre: 'Fantasy', author: 'J.R.R. Tolkien' },
          { genre: 'Magical Realism', author: 'Gabriel García Márquez' },
          { genre: 'Modernist', author: 'F. Scott Fitzgerald' },
          { genre: 'Psychological Thriller', author: 'Fyodor Dostoevsky' },
          { genre: 'Romance', author: 'Jane Austen' },
          { genre: 'Science Fiction', author: 'Douglas Adams' },
          { genre: 'Science Fiction', author: 'Frank Herbert' },
          { genre: 'Southern Gothic', author: 'Harper Lee' }
        );
      });

      it('returns group and accumulate results', async () => {
        const results = await randomCol
          .pipeline()
          .where(lt(Field.of('published'), 1984))
          .aggregate({
            accumulators: [avgFunction('rating').as('avgRating')],
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
            Field.of('rating').maximum().as('maxRating'),
            Field.of('published').minimum().as('minPublished')
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
          .where(andFunction(gt('rating', 4.5), eq('genre', 'Science Fiction')))
          .execute();
        expectResults(results, 'book10');
      });

      it('where with or', async () => {
        const results = await randomCol
          .pipeline()
          .where(orFunction(eq('genre', 'Romance'), eq('genre', 'Dystopian')))
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

      it('logical min works', async () => {
        const results = await randomCol
          .pipeline()
          .select(
            'title',
            logicalMinimum(Constant.of(1960), Field.of('published')).as(
              'published-safe'
            )
          )
          .sort(Field.of('title').ascending())
          .limit(3)
          .execute();
        expectResults(
          results,
          { title: '1984', 'published-safe': 1949 },
          { title: 'Crime and Punishment', 'published-safe': 1866 },
          { title: 'Dune', 'published-safe': 1960 }
        );
      });

      it('logical max works', async () => {
        const results = await randomCol
          .pipeline()
          .select(
            'title',
            logicalMaximum(Constant.of(1960), Field.of('published')).as(
              'published-safe'
            )
          )
          .sort(Field.of('title').ascending())
          .limit(3)
          .execute();
        expectResults(
          results,
          { title: '1984', 'published-safe': 1960 },
          { title: 'Crime and Punishment', 'published-safe': 1960 },
          { title: 'Dune', 'published-safe': 1965 }
        );
      });

      it('cond works', async () => {
        const results = await randomCol
          .pipeline()
          .select(
            'title',
            cond(
              lt(Field.of('published'), 1960),
              Constant.of(1960),
              Field.of('published')
            ).as('published-safe')
          )
          .sort(Field.of('title').ascending())
          .limit(3)
          .execute();
        expectResults(
          results,
          { title: '1984', 'published-safe': 1960 },
          { title: 'Crime and Punishment', 'published-safe': 1960 },
          { title: 'Dune', 'published-safe': 1965 }
        );
      });

      it('eqAny works', async () => {
        const results = await randomCol
          .pipeline()
          .where(eqAny('published', [1979, 1999, 1967]))
          .select('title')
          .execute();
        expectResults(
          results,
          { title: "The Hitchhiker's Guide to the Galaxy" },
          { title: 'One Hundred Years of Solitude' }
        );
      });

      it('notEqAny works', async () => {
        const results = await randomCol
          .pipeline()
          .where(
            notEqAny(
              'published',
              [1965, 1925, 1949, 1960, 1866, 1985, 1954, 1967, 1979]
            )
          )
          .select('title')
          .execute();
        expectResults(results, { title: 'Pride and Prejudice' });
      });

      it('arrayContains works', async () => {
        const results = await randomCol
          .pipeline()
          .where(arrayContains('tags', 'comedy'))
          .select('title')
          .execute();
        expectResults(results, {
          title: "The Hitchhiker's Guide to the Galaxy"
        });
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
            Field.of('author')
              .strConcat(' - ', Field.of('title'))
              .as('bookInfo')
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
        expectResults(results, {
          title: "The Hitchhiker's Guide to the Galaxy"
        });
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
            andFunction(
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
            orFunction(
              andFunction(gt('rating', 4.5), eq('genre', 'Science Fiction')),
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
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            'awards.hugo': true
          },
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

      it('supports internal serialization to proto', async () => {
        const pipeline = firestore
          .pipeline()
          .collection('books')
          .where(eq('awards.hugo', true))
          .select(
            'title',
            Field.of('nestedField.level.1'),
            mapGet('nestedField', 'level.1').mapGet('level.2').as('nested')
          );

        const proto = _internalPipelineToExecutePipelineRequestProto(pipeline);
        expect(proto).not.to.be.null;
      });

      describe('pagination', () => {
        async function addBooks(
          collection: CollectionReference
        ): Promise<void> {
          await setDoc(doc(randomCol, 'book11'), {
            title: 'Jonathan Strange & Mr Norrell',
            author: 'Susanna Clarke',
            genre: 'Fantasy',
            published: 2004,
            rating: 4.6,
            tags: [
              'historical fantasy',
              'magic',
              'alternate history',
              'england'
            ],
            awards: { hugo: false, nebula: false }
          });
          await setDoc(doc(randomCol, 'book12'), {
            title: 'The Master and Margarita',
            author: 'Mikhail Bulgakov',
            genre: 'Satire',
            published: 1967, // Though written much earlier
            rating: 4.6,
            tags: [
              'russian literature',
              'supernatural',
              'philosophy',
              'dark comedy'
            ],
            awards: {}
          });
          await setDoc(doc(randomCol, 'book13'), {
            title: 'A Long Way to a Small, Angry Planet',
            author: 'Becky Chambers',
            genre: 'Science Fiction',
            published: 2014,
            rating: 4.6,
            tags: [
              'space opera',
              'found family',
              'character-driven',
              'optimistic'
            ],
            awards: { hugo: false, nebula: false, kitschies: true }
          });
        }

        it('supports pagination with filters', async () => {
          await addBooks(randomCol);
          const pageSize = 2;
          const pipeline = randomCol
            .pipeline()
            .select('title', 'rating', '__name__')
            .sort(
              Field.of('rating').descending(),
              Field.of('__name__').ascending()
            );

          let results = await pipeline.limit(pageSize).execute();
          expectResults(
            results,
            { title: 'The Lord of the Rings', rating: 4.7 },
            { title: 'Jonathan Strange & Mr Norrell', rating: 4.6 }
          );

          const lastDoc = results[results.length - 1];

          results = await pipeline
            .where(
              orFunction(
                andFunction(
                  Field.of('rating').eq(lastDoc.get('rating')),
                  Field.of('__path__').gt(lastDoc.ref?.path)
                ),
                Field.of('rating').lt(lastDoc.get('rating'))
              )
            )
            .limit(pageSize)
            .execute();
          expectResults(
            results,
            { title: 'Pride and Prejudice', rating: 4.5 },
            { title: 'Crime and Punishment', rating: 4.3 }
          );
        });

        it('supports pagination with offsets', async () => {
          await addBooks(randomCol);

          const secondFilterField = '__path__';

          const pipeline = randomCol
            .pipeline()
            .select('title', 'rating', secondFilterField)
            .sort(
              Field.of('rating').descending(),
              Field.of(secondFilterField).ascending()
            );

          const pageSize = 2;
          let currPage = 0;

          let results = await pipeline
            .offset(currPage++ * pageSize)
            .limit(pageSize)
            .execute();

          expectResults(
            results,
            {
              title: 'The Lord of the Rings',
              rating: 4.7
            },
            { title: 'Dune', rating: 4.6 }
          );

          results = await pipeline
            .offset(currPage++ * pageSize)
            .limit(pageSize)
            .execute();
          expectResults(
            results,
            {
              title: 'Jonathan Strange & Mr Norrell',
              rating: 4.6
            },
            { title: 'The Master and Margarita', rating: 4.6 }
          );

          results = await pipeline
            .offset(currPage++ * pageSize)
            .limit(pageSize)
            .execute();
          expectResults(
            results,
            {
              title: 'A Long Way to a Small, Angry Planet',
              rating: 4.6
            },
            {
              title: 'Pride and Prejudice',
              rating: 4.5
            }
          );
        });
      });
    });

    describe('modular API', () => {
      it('works when creating a pipeline from a Firestore instance', async () => {
        const myPipeline = pipeline(firestore)
          .collection(randomCol.path)
          .where(lt(Field.of('published'), 1984))
          .aggregate({
            accumulators: [avgFunction('rating').as('avgRating')],
            groups: ['genre']
          })
          .where(gt('avgRating', 4.3))
          .sort(Field.of('avgRating').descending());

        const results = await execute(myPipeline);

        expectResults(
          results,
          { avgRating: 4.7, genre: 'Fantasy' },
          { avgRating: 4.5, genre: 'Romance' },
          { avgRating: 4.4, genre: 'Science Fiction' }
        );
      });

      it('works when creating a pipeline from a collection', async () => {
        const myPipeline = pipeline(randomCol)
          .where(lt(Field.of('published'), 1984))
          .aggregate({
            accumulators: [avgFunction('rating').as('avgRating')],
            groups: ['genre']
          })
          .where(gt('avgRating', 4.3))
          .sort(Field.of('avgRating').descending());

        const results = await execute(myPipeline);

        expectResults(
          results,
          { avgRating: 4.7, genre: 'Fantasy' },
          { avgRating: 4.5, genre: 'Romance' },
          { avgRating: 4.4, genre: 'Science Fiction' }
        );
      });
    });
  });

  // This is the Query integration tests from the lite API (no cache support)
  // with some additional test cases added for more complete coverage.
  describe('Query to Pipeline', () => {
    function verifyResults(
      actual: Array<PipelineResult<DocumentData>>,
      ...expected: DocumentData[]
    ): void {
      expect(actual.length).to.equal(expected.length);

      for (let i = 0; i < expected.length; ++i) {
        expect(actual[i].data()).to.deep.equal(expected[i]);
      }
    }

    it('supports default query', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        { 1: { foo: 1 } },
        async collRef => {
          const result = await collRef.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports filtered query', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, where('foo', '==', 1));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports filtered query (with FieldPath)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, where(new FieldPath('foo'), '==', 1));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports ordered query (with default order)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 }, { foo: 2 });
        }
      );
    });

    it('supports ordered query (with asc)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo', 'asc'));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 }, { foo: 2 });
        }
      );
    });

    it('supports ordered query (with desc)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo', 'desc'));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 }, { foo: 1 });
        }
      );
    });

    it('supports limit query', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), limit(1));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports limitToLast query', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 },
          3: { foo: 3 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), limitToLast(2));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 }, { foo: 3 });
        }
      );
    });

    it('supports startAt', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), startAt(2));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 });
        }
      );
    });

    it('supports startAfter (with DocumentReference)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { id: 1, foo: 1, bar: 1, baz: 1 },
          2: { id: 2, foo: 1, bar: 1, baz: 2 },
          3: { id: 3, foo: 1, bar: 1, baz: 2 },
          4: { id: 4, foo: 1, bar: 2, baz: 1 },
          5: { id: 5, foo: 1, bar: 2, baz: 2 },
          6: { id: 6, foo: 1, bar: 2, baz: 2 },
          7: { id: 7, foo: 2, bar: 1, baz: 1 },
          8: { id: 8, foo: 2, bar: 1, baz: 2 },
          9: { id: 9, foo: 2, bar: 1, baz: 2 },
          10: { id: 10, foo: 2, bar: 2, baz: 1 },
          11: { id: 11, foo: 2, bar: 2, baz: 2 },
          12: { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async collRef => {
          let docRef = await getDoc(doc(collRef, '2'));
          let query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAfter(docRef)
          );
          let result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );

          docRef = await getDoc(doc(collRef, '3'));
          query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAfter(docRef)
          );
          result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );
        }
      );
    });

    it('supports startAt (with DocumentReference)', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { id: 1, foo: 1, bar: 1, baz: 1 },
          2: { id: 2, foo: 1, bar: 1, baz: 2 },
          3: { id: 3, foo: 1, bar: 1, baz: 2 },
          4: { id: 4, foo: 1, bar: 2, baz: 1 },
          5: { id: 5, foo: 1, bar: 2, baz: 2 },
          6: { id: 6, foo: 1, bar: 2, baz: 2 },
          7: { id: 7, foo: 2, bar: 1, baz: 1 },
          8: { id: 8, foo: 2, bar: 1, baz: 2 },
          9: { id: 9, foo: 2, bar: 1, baz: 2 },
          10: { id: 10, foo: 2, bar: 2, baz: 1 },
          11: { id: 11, foo: 2, bar: 2, baz: 2 },
          12: { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async collRef => {
          let docRef = await getDoc(doc(collRef, '2'));
          let query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAt(docRef)
          );
          let result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 2, foo: 1, bar: 1, baz: 2 },
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );

          docRef = await getDoc(doc(collRef, '3'));
          query1 = query(
            collRef,
            orderBy('foo'),
            orderBy('bar'),
            orderBy('baz'),
            startAt(docRef)
          );
          result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 },
            { id: 11, foo: 2, bar: 2, baz: 2 },
            { id: 12, foo: 2, bar: 2, baz: 2 }
          );
        }
      );
    });

    it('supports startAfter', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), startAfter(1));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 });
        }
      );
    });

    it('supports endAt', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), endAt(1));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports endBefore', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          const query1 = query(collRef, orderBy('foo'), endBefore(2));
          const result = await query1.pipeline().execute();
          verifyResults(result, { foo: 1 });
        }
      );
    });

    it('supports pagination', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          let query1 = query(collRef, orderBy('foo'), limit(1));
          const pipeline1 = query1.pipeline();
          let result = await pipeline1.execute();
          verifyResults(result, { foo: 1 });

          // Pass the document snapshot from the previous result
          query1 = query(query1, startAfter(result[0].get('foo')));
          result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 });
        }
      );
    });

    it('supports pagination on DocumentIds', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          1: { foo: 1 },
          2: { foo: 2 }
        },
        async collRef => {
          let query1 = query(
            collRef,
            orderBy('foo'),
            orderBy(documentId(), 'asc'),
            limit(1)
          );
          const pipeline1 = query1.pipeline();
          let result = await pipeline1.execute();
          verifyResults(result, { foo: 1 });

          // Pass the document snapshot from the previous result
          query1 = query(
            query1,
            startAfter(result[0].get('foo'), result[0].ref?.id)
          );
          result = await query1.pipeline().execute();
          verifyResults(result, { foo: 2 });
        }
      );
    });

    it('supports collection groups', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {},
        async collRef => {
          const collectionGroupId = `${collRef.id}group`;

          const fooDoc = doc(
            collRef.firestore,
            `${collRef.id}/foo/${collectionGroupId}/doc1`
          );
          const barDoc = doc(
            collRef.firestore,
            `${collRef.id}/bar/baz/boo/${collectionGroupId}/doc2`
          );
          await setDoc(fooDoc, { foo: 1 });
          await setDoc(barDoc, { bar: 1 });

          const query1 = collectionGroup(collRef.firestore, collectionGroupId);
          const result = await query1.pipeline().execute();

          verifyResults(result, { bar: 1 }, { foo: 1 });
        }
      );
    });

    it('supports query over collection path with special characters', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {},
        async collRef => {
          const docWithSpecials = doc(collRef, 'so!@#$%^&*()_+special');

          const collectionWithSpecials = collection(
            docWithSpecials,
            'so!@#$%^&*()_+special'
          );
          await addDoc(collectionWithSpecials, { foo: 1 });
          await addDoc(collectionWithSpecials, { foo: 2 });

          const result = await query(
            collectionWithSpecials,
            orderBy('foo', 'asc')
          )
            .pipeline()
            .execute();

          verifyResults(result, { foo: 1 }, { foo: 2 });
        }
      );
    });

    it('supports multiple inequality on same field', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          '01': { id: 1, foo: 1, bar: 1, baz: 1 },
          '02': { id: 2, foo: 1, bar: 1, baz: 2 },
          '03': { id: 3, foo: 1, bar: 1, baz: 2 },
          '04': { id: 4, foo: 1, bar: 2, baz: 1 },
          '05': { id: 5, foo: 1, bar: 2, baz: 2 },
          '06': { id: 6, foo: 1, bar: 2, baz: 2 },
          '07': { id: 7, foo: 2, bar: 1, baz: 1 },
          '08': { id: 8, foo: 2, bar: 1, baz: 2 },
          '09': { id: 9, foo: 2, bar: 1, baz: 2 },
          '10': { id: 10, foo: 2, bar: 2, baz: 1 },
          '11': { id: 11, foo: 2, bar: 2, baz: 2 },
          '12': { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async collRef => {
          const query1 = query(
            collRef,
            and(where('id', '>', 2), where('id', '<=', 10))
          );
          const result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 3, foo: 1, bar: 1, baz: 2 },
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 5, foo: 1, bar: 2, baz: 2 },
            { id: 6, foo: 1, bar: 2, baz: 2 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 8, foo: 2, bar: 1, baz: 2 },
            { id: 9, foo: 2, bar: 1, baz: 2 },
            { id: 10, foo: 2, bar: 2, baz: 1 }
          );
        }
      );
    });

    it('supports multiple inequality on different fields', () => {
      return withTestCollection(
        PERSISTENCE_MODE_UNSPECIFIED,
        {
          '01': { id: 1, foo: 1, bar: 1, baz: 1 },
          '02': { id: 2, foo: 1, bar: 1, baz: 2 },
          '03': { id: 3, foo: 1, bar: 1, baz: 2 },
          '04': { id: 4, foo: 1, bar: 2, baz: 1 },
          '05': { id: 5, foo: 1, bar: 2, baz: 2 },
          '06': { id: 6, foo: 1, bar: 2, baz: 2 },
          '07': { id: 7, foo: 2, bar: 1, baz: 1 },
          '08': { id: 8, foo: 2, bar: 1, baz: 2 },
          '09': { id: 9, foo: 2, bar: 1, baz: 2 },
          '10': { id: 10, foo: 2, bar: 2, baz: 1 },
          '11': { id: 11, foo: 2, bar: 2, baz: 2 },
          '12': { id: 12, foo: 2, bar: 2, baz: 2 }
        },
        async collRef => {
          const query1 = query(
            collRef,
            and(where('id', '>=', 2), where('baz', '<', 2))
          );
          const result = await query1.pipeline().execute();
          verifyResults(
            result,
            { id: 4, foo: 1, bar: 2, baz: 1 },
            { id: 7, foo: 2, bar: 1, baz: 1 },
            { id: 10, foo: 2, bar: 2, baz: 1 }
          );
        }
      );
    });
  });
});
