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

import { Bytes, getFirestore, terminate, vector } from '../../../src/api';
import {
  array,
  descending,
  genericFunction,
  isNan,
  map
} from '../../../src/lite-api/expressions';
import { GeoPoint } from '../../../src/lite-api/geo_point';
import { Timestamp } from '../../../src/lite-api/timestamp';
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
  notEqAny,
  collection,
  multiply,
  countif,
  bitAnd,
  bitOr,
  bitXor,
  bitNot,
  bitLeftShift,
  bitRightShift,
  rand,
  arrayOffset,
  currentContext,
  isError,
  ifError,
  isAbsent,
  isNull,
  isNotNull,
  isNotNan,
  mapRemove,
  mapMerge,
  documentIdFunction,
  substr,
  manhattanDistance
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';

use(chaiAsPromised);

setLogLevel('debug');

apiDescribe.only('Pipelines', persistence => {
  addEqualityMatcher();

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
        awards: { hugo: false, nebula: false },
        remarks: null,
        cost: NaN
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

  it('supports CollectionReference as source', async () => {
    const result = await firestore.pipeline().collection(randomCol).execute();
    expect(result.length).to.equal(10);
  });

  it('supports list of documents as source', async () => {
    const collName = randomCol.id;

    const result = await firestore
      .pipeline()
      .documents([
        `${collName}/book1`,
        doc(randomCol, 'book2'),
        doc(randomCol, 'book3').path
      ])
      .execute();
    expect(result.length).to.equal(3);
  });

  it('reject CollectionReference for another DB', async () => {
    const db2 = getFirestore(firestore.app, 'notDefault');

    expect(() => {
      firestore.pipeline().collection(collection(db2, 'foo'));
    }).to.throw(/Invalid CollectionReference/);

    await terminate(db2);
  });

  it('reject DocumentReference for another DB', async () => {
    const db2 = getFirestore(firestore.app, 'notDefault');

    expect(() => {
      firestore.pipeline().documents([doc(db2, 'foo/bar')]);
    }).to.throw(/Invalid DocumentReference/);

    await terminate(db2);
  });

  it('converts arrays and plain objects to functionValues if the customer intent is unspecified', async () => {
    const result = await firestore
      .pipeline()
      .collection(randomCol.path)
      .sort(Field.of('rating').descending())
      .limit(1)
      .select(
        'title',
        'author',
        'genre',
        'rating',
        'published',
        'tags',
        'awards'
      )
      .addFields(
        array([
          1,
          2,
          Field.of('genre'),
          multiply('rating', 10),
          [Field.of('title')],
          {
            published: Field.of('published')
          }
        ]).as('metadataArray'),
        map({
          genre: Field.of('genre'),
          rating: multiply('rating', 10),
          nestedArray: [Field.of('title')],
          nestedMap: {
            published: Field.of('published')
          }
        }).as('metadata')
      )
      .where(
        andFunction(
          eq('metadataArray', [
            1,
            2,
            Field.of('genre'),
            multiply('rating', 10),
            [Field.of('title')],
            {
              published: Field.of('published')
            }
          ]),
          eq('metadata', {
            genre: Field.of('genre'),
            rating: multiply('rating', 10),
            nestedArray: [Field.of('title')],
            nestedMap: {
              published: Field.of('published')
            }
          })
        )
      )
      .execute();

    expect(result.length).to.equal(1);

    expectResults(result, {
      title: 'The Lord of the Rings',
      author: 'J.R.R. Tolkien',
      genre: 'Fantasy',
      published: 1954,
      rating: 4.7,
      tags: ['adventure', 'magic', 'epic'],
      awards: { hugo: false, nebula: false },
      metadataArray: [
        1,
        2,
        'Fantasy',
        47,
        ['The Lord of the Rings'],
        {
          published: 1954
        }
      ],
      metadata: {
        genre: 'Fantasy',
        rating: 47,
        nestedArray: ['The Lord of the Rings'],
        nestedMap: {
          published: 1954
        }
      }
    });
  });

  it('accepts and returns all data types', async () => {
    const refDate = new Date();
    const refTimestamp = Timestamp.now();
    const constants = [
      Constant.of(1).as('number'),
      Constant.of('a string').as('string'),
      Constant.of(true).as('boolean'),
      Constant.of(null).as('null'),
      Constant.of(new GeoPoint(0.1, 0.2)).as('geoPoint'),
      Constant.of(refTimestamp).as('timestamp'),
      Constant.of(refDate).as('date'),
      Constant.of(
        Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0]))
      ).as('bytes'),
      Constant.of(doc(firestore, 'foo', 'bar')).as('documentReference'),
      Constant.of(vector([1, 2, 3])).as('vectorValue'),
      Constant.of({
        'number': 1,
        'string': 'a string',
        'boolean': true,
        'null': null,
        'geoPoint': new GeoPoint(0.1, 0.2),
        'timestamp': refTimestamp,
        'date': refDate,
        'uint8Array': Bytes.fromUint8Array(
          new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0])
        ),
        'documentReference': doc(firestore, 'foo', 'bar'),
        'vectorValue': vector([1, 2, 3]),
        'map': {
          'number': 2,
          'string': 'b string'
        },
        'array': [1, 'c string']
      }).as('map'),
      Constant.of([
        1,
        'a string',
        true,
        null,
        new GeoPoint(0.1, 0.2),
        refTimestamp,
        refDate,
        Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0])),
        doc(firestore, 'foo', 'bar'),
        vector([1, 2, 3]),
        {
          'number': 2,
          'string': 'b string'
        }
      ]).as('array')
    ];

    const results = await randomCol
      .pipeline()
      .limit(1)
      .select(...constants)
      .execute();

    expectResults(results, {
      'number': 1,
      'string': 'a string',
      'boolean': true,
      'null': null,
      'geoPoint': new GeoPoint(0.1, 0.2),
      'timestamp': refTimestamp,
      'date': Timestamp.fromDate(refDate),
      'bytes': Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0])),
      'documentReference': doc(firestore, 'foo', 'bar'),
      'vectorValue': vector([1, 2, 3]),
      'map': {
        'number': 1,
        'string': 'a string',
        'boolean': true,
        'null': null,
        'geoPoint': new GeoPoint(0.1, 0.2),
        'timestamp': refTimestamp,
        'date': Timestamp.fromDate(refDate),
        'uint8Array': Bytes.fromUint8Array(
          new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0])
        ),
        'documentReference': doc(firestore, 'foo', 'bar'),
        'vectorValue': vector([1, 2, 3]),
        'map': {
          'number': 2,
          'string': 'b string'
        },
        'array': [1, 'c string']
      },
      'array': [
        1,
        'a string',
        true,
        null,
        new GeoPoint(0.1, 0.2),
        refTimestamp,
        Timestamp.fromDate(refDate),
        Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0])),
        doc(firestore, 'foo', 'bar'),
        vector([1, 2, 3]),
        {
          'number': 2,
          'string': 'b string'
        }
      ]
    });
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

  describe('stages', () => {
    describe('aggregate stage', () => {
      it('supports aggregate', async () => {
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

      it('returns countif accumulation', async () => {
        let results = await randomCol
          .pipeline()
          .aggregate(countif(Field.of('rating').gt(4.3)).as('count'))
          .execute();
        const expectedResults = {
          count: 3
        };
        expectResults(results, expectedResults);

        results = await randomCol
          .pipeline()
          .aggregate(Field.of('rating').gt(4.3).countif().as('count'))
          .execute();
        expectResults(results, expectedResults);
      });
    });

    describe('distinct stage', () => {
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
    });

    describe('select stage', () => {
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
    });

    describe('addField stage', () => {
      it('can add fields', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .select('title', 'author')
          .addFields(Constant.of('bar').as('foo'))
          .sort(Field.of('author').ascending())
          .execute();
        expectResults(
          results,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            foo: 'bar'
          },
          {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            foo: 'bar'
          },
          { title: 'Dune', author: 'Frank Herbert', foo: 'bar' },
          {
            title: 'Crime and Punishment',
            author: 'Fyodor Dostoevsky',
            foo: 'bar'
          },
          {
            title: 'One Hundred Years of Solitude',
            author: 'Gabriel García Márquez',
            foo: 'bar'
          },
          { title: '1984', author: 'George Orwell', foo: 'bar' },
          {
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            foo: 'bar'
          },
          {
            title: 'The Lord of the Rings',
            author: 'J.R.R. Tolkien',
            foo: 'bar'
          },
          { title: 'Pride and Prejudice', author: 'Jane Austen', foo: 'bar' },
          {
            title: "The Handmaid's Tale",
            author: 'Margaret Atwood',
            foo: 'bar'
          }
        );
      });
    });

    describe('where stage', () => {
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
    });

    describe('sort, offset, and limit stages', () => {
      it('supports sort, offset, and limits', async () => {
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
    });

    describe('generic stage', () => {
      it('can select fields', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .genericStage('select', [
            {
              title: Field.of('title'),
              metadata: {
                'author': Field.of('author')
              }
            }
          ])
          .sort(Field.of('author').ascending())
          .limit(1)
          .execute();
        expectResults(results, {
          title: "The Hitchhiker's Guide to the Galaxy",
          metadata: {
            author: 'Douglas Adams'
          }
        });
      });

      it('can add fields', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(Field.of('author').ascending())
          .limit(1)
          .select('title', 'author')
          .genericStage('add_fields', [
            {
              display: Field.of('title').strConcat(' - ', Field.of('author'))
            }
          ])
          .execute();
        expectResults(results, {
          title: "The Hitchhiker's Guide to the Galaxy",
          author: 'Douglas Adams',
          display: "The Hitchhiker's Guide to the Galaxy - Douglas Adams"
        });
      });

      it('can filter with where', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .select('title', 'author')
          .genericStage('where', [Field.of('author').eq('Douglas Adams')])
          .execute();
        expectResults(results, {
          title: "The Hitchhiker's Guide to the Galaxy",
          author: 'Douglas Adams'
        });
      });

      it('can limit, offset, and sort', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .select('title', 'author')
          .genericStage('sort', [
            {
              direction: 'ascending',
              expression: Field.of('author')
            }
          ])
          .genericStage('offset', [3])
          .genericStage('limit', [1])
          .execute();
        expectResults(results, {
          author: 'Fyodor Dostoevsky',
          title: 'Crime and Punishment'
        });
      });

      it('can perform aggregate query', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .select('title', 'author', 'rating')
          .genericStage('aggregate', [
            { averageRating: Field.of('rating').avg() },
            {}
          ])
          .execute();
        expectResults(results, {
          averageRating: 4.3100000000000005
        });
      });

      it('can perform distinct query', async () => {
        const results = await firestore
          .pipeline()
          .collection(randomCol.path)
          .select('title', 'author', 'rating')
          .genericStage('distinct', [{ rating: Field.of('rating') }])
          .sort(Field.of('rating').descending())
          .execute();
        expectResults(
          results,
          {
            rating: 4.7
          },
          {
            rating: 4.6
          },
          {
            rating: 4.5
          },
          {
            rating: 4.3
          },
          {
            rating: 4.2
          },
          {
            rating: 4.1
          },
          {
            rating: 4.0
          }
        );
      });
    });
  });

  describe('function expressions', () => {
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
      let results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(
          isNull('rating').as('ratingIsNull'),
          isNan('rating').as('ratingIsNaN'),
          isError(arrayOffset('title', 0)).as('isError'),
          ifError(arrayOffset('title', 0), Constant.of('was error')).as(
            'ifError'
          ),
          isAbsent('foo').as('isAbsent'),
          isNotNull('title').as('titleIsNotNull'),
          isNotNan('cost').as('costIsNotNan')
        )
        .execute();
      expectResults(results, {
        ratingIsNull: false,
        ratingIsNaN: false,
        isError: true,
        ifError: 'was error',
        isAbsent: true,
        titleIsNotNull: true,
        costIsNotNan: false
      });

      results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(
          Field.of('rating').isNull().as('ratingIsNull'),
          Field.of('rating').isNaN().as('ratingIsNaN'),
          arrayOffset('title', 0).isError().as('isError'),
          arrayOffset('title', 0)
            .ifError(Constant.of('was error'))
            .as('ifError'),
          Field.of('foo').isAbsent().as('isAbsent'),
          Field.of('title').isNotNull().as('titleIsNotNull'),
          Field.of('cost').isNotNan().as('costIsNotNan')
        )
        .execute();
      expectResults(results, {
        ratingIsNull: false,
        ratingIsNaN: false,
        isError: true,
        ifError: 'was error',
        isAbsent: true,
        titleIsNotNull: true,
        costIsNotNan: false
      });
    });

    it('testMapGet', async () => {
      const results = await randomCol
        .pipeline()
        .sort(Field.of('published').descending())
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

    it('testDistanceFunctions', async () => {
      const sourceVector = [0.1, 0.1];
      const targetVector = [0.5, 0.8];
      let results = await randomCol
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
          ),
          manhattanDistance(Constant.vector(sourceVector), targetVector).as(
            'manhattanDistance'
          )
        )
        .limit(1)
        .execute();

      expectResults(results, {
        cosineDistance: 0.02560880430538015,
        dotProductDistance: 0.13,
        euclideanDistance: 0.806225774829855,
        manhattanDistance: 1.1
      });

      results = await randomCol
        .pipeline()
        .select(
          Constant.vector(sourceVector)
            .cosineDistance(targetVector)
            .as('cosineDistance'),
          Constant.vector(sourceVector)
            .dotProduct(targetVector)
            .as('dotProductDistance'),
          Constant.vector(sourceVector)
            .euclideanDistance(targetVector)
            .as('euclideanDistance'),
          Constant.vector(sourceVector)
            .manhattanDistance(targetVector)
            .as('manhattanDistance')
        )
        .limit(1)
        .execute();

      expectResults(results, {
        cosineDistance: 0.02560880430538015,
        dotProductDistance: 0.13,
        euclideanDistance: 0.806225774829855,
        manhattanDistance: 1.1
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

    describe('genericFunction', () => {
      it('add selectable', async () => {
        const results = await randomCol
          .pipeline()
          .sort(descending('rating'))
          .limit(1)
          .select(
            genericFunction('add', [Field.of('rating'), Constant.of(1)]).as(
              'rating'
            )
          )
          .execute();
        expectResults(results, {
          rating: 5.7
        });
      });

      it('and (variadic) selectable', async () => {
        const results = await randomCol
          .pipeline()
          .where(
            genericFunction('and', [
              Field.of('rating').gt(0),
              Field.of('title').charLength().lt(5),
              Field.of('tags').arrayContains('propaganda')
            ])
          )
          .select('title')
          .execute();
        expectResults(results, {
          title: '1984'
        });
      });

      it('array contains any', async () => {
        const results = await randomCol
          .pipeline()
          .where(
            genericFunction('array_contains_any', [
              Field.of('tags'),
              ['politics']
            ])
          )
          .select('title')
          .execute();
        expectResults(results, {
          title: 'Dune'
        });
      });

      it('countif aggregate', async () => {
        const results = await randomCol
          .pipeline()
          .aggregate(
            genericFunction('countif', [Field.of('rating').gte(4.5)]).as(
              'countOfBest'
            )
          )
          .execute();
        expectResults(results, {
          countOfBest: 3
        });
      });

      it('sort by char_len', async () => {
        const results = await randomCol
          .pipeline()
          .sort(
            genericFunction('char_length', [Field.of('title')]).ascending(),
            descending('__name__')
          )
          .limit(3)
          .select('title')
          .execute();
        expectResults(
          results,
          {
            title: '1984'
          },
          {
            title: 'Dune'
          },
          {
            title: 'The Great Gatsby'
          }
        );
      });
    });

    describe.skip('not implemented in backend', () => {
      it('supports Bit_and', async () => {
        const results = await randomCol
          .pipeline()
          .limit(1)
          .select(bitAnd(Constant.of(5), 12).as('result'))
          .execute();
        expectResults(results, {
          result: 4
        });
        it('supports Bit_and', async () => {
          const results = await randomCol
            .pipeline()
            .limit(1)
            .select(Constant.of(5).bitAnd(12).as('result'))
            .execute();
          expectResults(results, {
            result: 4
          });
        });

        it('supports Bit_or', async () => {
          let results = await randomCol
            .pipeline()
            .limit(1)
            .select(bitOr(Constant.of(5), 12).as('result'))
            .execute();
          expectResults(results, {
            result: 13
          });
          results = await randomCol
            .pipeline()
            .limit(1)
            .select(Constant.of(5).bitOr(12).as('result'))
            .execute();
          expectResults(results, {
            result: 13
          });
        });

        it('supports Bit_xor', async () => {
          let results = await randomCol
            .pipeline()
            .limit(1)
            .select(bitXor(Constant.of(5), 12).as('result'))
            .execute();
          expectResults(results, {
            result: 9
          });
          results = await randomCol
            .pipeline()
            .limit(1)
            .select(Constant.of(5).bitXor(12).as('result'))
            .execute();
          expectResults(results, {
            result: 9
          });
        });

        it('supports Bit_not', async () => {
          let results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              bitNot(Constant.of(Bytes.fromUint8Array(Uint8Array.of(0xfd)))).as(
                'result'
              )
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x02))
          });
          results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              Constant.of(Bytes.fromUint8Array(Uint8Array.of(0xfd)))
                .bitNot()
                .as('result')
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x02))
          });
        });

        it('supports Bit_left_shift', async () => {
          let results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              bitLeftShift(
                Constant.of(Bytes.fromUint8Array(Uint8Array.of(0x02))),
                2
              ).as('result')
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x04))
          });
          results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              Constant.of(Bytes.fromUint8Array(Uint8Array.of(0x02)))
                .bitLeftShift(2)
                .as('result')
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x04))
          });
        });

        it('supports Bit_right_shift', async () => {
          let results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              bitRightShift(
                Constant.of(Bytes.fromUint8Array(Uint8Array.of(0x02))),
                2
              ).as('result')
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x01))
          });
          results = await randomCol
            .pipeline()
            .limit(1)
            .select(
              Constant.of(Bytes.fromUint8Array(Uint8Array.of(0x02)))
                .bitRightShift(2)
                .as('result')
            )
            .execute();
          expectResults(results, {
            result: Bytes.fromUint8Array(Uint8Array.of(0x01))
          });
        });

        it('supports Document_id', async () => {
          let results = await randomCol
            .pipeline()
            .sort(Field.of('rating').descending())
            .limit(1)
            .select(documentIdFunction(Field.of('__path__')).as('docId'))
            .execute();
          expectResults(results, {
            docId: 'book4'
          });
          results = await randomCol
            .pipeline()
            .sort(Field.of('rating').descending())
            .limit(1)
            .select(Field.of('__path__').documentId().as('docId'))
            .execute();
          expectResults(results, {
            docId: 'book4'
          });
        });

        it('supports Substr', async () => {
          let results = await randomCol
            .pipeline()
            .sort(Field.of('rating').descending())
            .limit(1)
            .select(substr('title', 9, 2).as('of'))
            .execute();
          expectResults(results, {
            of: 'of'
          });
          results = await randomCol
            .pipeline()
            .sort(Field.of('rating').descending())
            .limit(1)
            .select(Field.of('title').substr(9, 2).as('of'))
            .execute();
          expectResults(results, {
            of: 'of'
          });
        });

        it('arrayConcat works', async () => {
          const results = await randomCol
            .pipeline()
            .select(
              Field.of('tags')
                .arrayConcat(['newTag1', 'newTag2'])
                .as('modifiedTags')
            )
            .limit(1)
            .execute();
          expectResults(results, {
            modifiedTags: ['comedy', 'space', 'adventure', 'newTag1', 'newTag2']
          });
        });

        it('testToLowercase', async () => {
          const results = await randomCol
            .pipeline()
            .select(Field.of('title').toLower().as('lowercaseTitle'))
            .limit(1)
            .execute();
          expectResults(results, {
            lowercaseTitle: "the hitchhiker's guide to the galaxy"
          });
        });

        it('testToUppercase', async () => {
          const results = await randomCol
            .pipeline()
            .select(Field.of('author').toUpper().as('uppercaseAuthor'))
            .limit(1)
            .execute();
          expectResults(results, { uppercaseAuthor: 'DOUGLAS ADAMS' });
        });

        it('testTrim', async () => {
          const results = await randomCol
            .pipeline()
            .addFields(
              Constant.of(" The Hitchhiker's Guide to the Galaxy ").as(
                'spacedTitle'
              )
            )
            .select(
              Field.of('spacedTitle').trim().as('trimmedTitle'),
              Field.of('spacedTitle')
            )
            .limit(1)
            .execute();
          expectResults(results, {
            spacedTitle: " The Hitchhiker's Guide to the Galaxy ",
            trimmedTitle: "The Hitchhiker's Guide to the Galaxy"
          });
        });
      });

      it('supports Rand', async () => {
        const results = await randomCol
          .pipeline()
          .limit(10)
          .select(rand().as('result'))
          .execute();
        expect(results.length).to.equal(10);
        results.forEach(d => {
          expect(d.get('result')).to.be.lt(1);
          expect(d.get('result')).to.be.gte(0);
        });
      });

      it('supports array', async () => {
        const result = await firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(Field.of('rating').descending())
          .limit(1)
          .select(array([1, 2, 3, 4]).as('metadata'))
          .execute();
        expect(result.length).to.equal(1);
        expectResults(result, {
          metadata: [1, 2, 3, 4]
        });
      });

      it('evaluates expression in array', async () => {
        const result = await firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(Field.of('rating').descending())
          .limit(1)
          .select(
            array([1, 2, Field.of('genre'), multiply('rating', 10)]).as(
              'metadata'
            )
          )
          .execute();
        expect(result.length).to.equal(1);
        expectResults(result, {
          metadata: [1, 2, 'Fantasy', 47]
        });
      });

      it('supports arrayOffset', async () => {
        let results = await randomCol
          .pipeline()
          .sort(Field.of('rating').descending())
          .limit(3)
          .select(arrayOffset('tags', 0).as('firstTag'))
          .execute();
        const expectedResults = [
          {
            firstTag: 'adventure'
          },
          {
            firstTag: 'politics'
          },
          {
            firstTag: 'classic'
          }
        ];
        expectResults(results, ...expectedResults);

        results = await randomCol
          .pipeline()
          .sort(Field.of('rating').descending())
          .limit(3)
          .select(Field.of('tags').arrayOffset(0).as('firstTag'))
          .execute();
        expectResults(results, ...expectedResults);
      });
    });

    // TODO: current_context tests with are failing because of b/395937453
    it.skip('supports currentContext', async () => {
      const results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(currentContext().as('currentContext'))
        .execute();
      expectResults(results, {
        currentContext: 'TODO'
      });
    });

    it('supports map', async () => {
      const result = await firestore
        .pipeline()
        .collection(randomCol.path)
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(
          map({
            foo: 'bar'
          }).as('metadata')
        )
        .execute();

      expect(result.length).to.equal(1);
      expectResults(result, {
        metadata: {
          foo: 'bar'
        }
      });
    });

    it('evaluates expression in map', async () => {
      const result = await firestore
        .pipeline()
        .collection(randomCol.path)
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(
          map({
            genre: Field.of('genre'),
            rating: Field.of('rating').multiply(10)
          }).as('metadata')
        )
        .execute();

      expect(result.length).to.equal(1);
      expectResults(result, {
        metadata: {
          genre: 'Fantasy',
          rating: 47
        }
      });
    });

    it('supports mapRemove', async () => {
      let results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(mapRemove('awards', 'hugo').as('awards'))
        .execute();
      expectResults(results, {
        awards: { nebula: false }
      });
      results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(Field.of('awards').mapRemove('hugo').as('awards'))
        .execute();
      expectResults(results, {
        awards: { nebula: false }
      });
    });

    it('supports mapMerge', async () => {
      let results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(mapMerge('awards', { fakeAward: true }).as('awards'))
        .execute();
      expectResults(results, {
        awards: { nebula: false, hugo: false, fakeAward: true }
      });
      results = await randomCol
        .pipeline()
        .sort(Field.of('rating').descending())
        .limit(1)
        .select(Field.of('awards').mapMerge({ fakeAward: true }).as('awards'))
        .execute();
      expectResults(results, {
        awards: { nebula: false, hugo: false, fakeAward: true }
      });
    });
  });

  describe('pagination', () => {
    /**
     * Adds several books to the test collection. These
     * additional books support pagination test scenarios
     * that would otherwise not be possible with the original
     * set of books.
     * @param collection
     */
    async function addBooks(collection: CollectionReference): Promise<void> {
      await setDoc(doc(randomCol, 'book11'), {
        title: 'Jonathan Strange & Mr Norrell',
        author: 'Susanna Clarke',
        genre: 'Fantasy',
        published: 2004,
        rating: 4.6,
        tags: ['historical fantasy', 'magic', 'alternate history', 'england'],
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
        tags: ['space opera', 'found family', 'character-driven', 'optimistic'],
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
              Field.of('__path__').gt(lastDoc.ref?.id)
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
