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

// eslint-disable-next-line import/no-extraneous-dependencies
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { Bytes } from '../../src/lite-api/bytes';
import {
  Firestore,
  getFirestore,
  terminate
} from '../../src/lite-api/database';
import { documentId as documentIdFieldPath } from '../../src/lite-api/field_path';
import { vector } from '../../src/lite-api/field_value_impl';
import { GeoPoint } from '../../src/lite-api/geo_point';
import {
  pipelineResultEqual,
  PipelineSnapshot
} from '../../src/lite-api/pipeline-result';
import { execute } from '../../src/lite-api/pipeline_impl';
import {
  DocumentData,
  CollectionReference,
  collection,
  doc,
  DocumentReference
} from '../../src/lite-api/reference';
import { addDoc, setDoc, deleteDoc } from '../../src/lite-api/reference_impl';
import { FindNearestStageOptions } from '../../src/lite-api/stage_options';
import { Timestamp } from '../../src/lite-api/timestamp';
import { writeBatch } from '../../src/lite-api/write_batch';
import { addEqualityMatcher } from '../util/equality_matcher';
import { describe } from '../util/mocha_extensions';
import { Deferred } from '../util/promise';

import { withTestCollection } from './helpers';
import {
  field,
  and,
  array,
  constant,
  add,
  subtract,
  multiply,
  average,
  substring,
  count,
  mapMerge,
  mapRemove,
  ifError,
  isAbsent,
  isError,
  or,
  map,
  length,
  mod,
  documentId,
  equal,
  notEqual,
  lessThan,
  countIf,
  lessThanOrEqual,
  greaterThan,
  arrayContains,
  arrayContainsAny,
  equalAny,
  notEqualAny,
  xor,
  conditional,
  logicalMaximum,
  logicalMinimum,
  exists,
  reverse,
  like,
  regexContains,
  regexFind,
  regexFindAll,
  regexMatch,
  stringContains,
  startsWith,
  endsWith,
  mapGet,
  countAll,
  minimum,
  maximum,
  cosineDistance,
  dotProduct,
  euclideanDistance,
  vectorLength,
  unixMicrosToTimestamp,
  timestampToUnixMicros,
  unixMillisToTimestamp,
  timestampToUnixMillis,
  unixSecondsToTimestamp,
  timestampToUnixSeconds,
  timestampAdd,
  timestampSubtract,
  ascending,
  descending,
  FunctionExpression,
  AggregateFunction,
  stringConcat,
  arrayContainsAll,
  arrayLength,
  charLength,
  divide,
  not,
  toLower,
  toUpper,
  trim,
  byteLength,
  arrayGet,
  abs,
  sum,
  countDistinct,
  ceil,
  floor,
  exp,
  pow,
  round,
  collectionId,
  ln,
  log,
  sqrt,
  stringReverse,
  log10,
  concat,
  currentTimestamp,
  ifAbsent,
  join,
  arraySum,
  arrayFirst,
  arrayFirstN,
  arrayLast,
  arrayLastN,
  arrayMaximum,
  arrayMaximumN,
  arrayMinimum,
  arrayMinimumN,
  arrayFilter,
  arrayIndexOf,
  arrayIndexOfAll,
  arrayLastIndexOf,
  arraySlice
} from './pipeline_export';

use(chaiAsPromised);

const timestampDeltaMS = 1000;

describe.skipClassic('Firestore Pipelines', () => {
  addEqualityMatcher();

  let firestore: Firestore;
  let randomCol: CollectionReference;
  let beginDocCreation: number = 0;
  let endDocCreation: number = 0;

  async function testCollectionWithDocs(docs: {
    [id: string]: DocumentData;
  }): Promise<CollectionReference<DocumentData>> {
    beginDocCreation = new Date().valueOf();
    for (const id in docs) {
      if (docs.hasOwnProperty(id)) {
        const ref = doc(randomCol, id);
        await setDoc(ref, docs[id]);
      }
    }
    endDocCreation = new Date().valueOf();
    return randomCol;
  }

  function expectResults(snapshot: PipelineSnapshot, ...docs: string[]): void;
  function expectResults(
    snapshot: PipelineSnapshot,
    ...data: DocumentData[]
  ): void;

  function expectResults(
    snapshot: PipelineSnapshot,
    ...data: DocumentData[] | string[]
  ): void {
    const docs = snapshot.results;

    expect(docs.length).to.equal(data.length);

    if (data.length > 0) {
      if (typeof data[0] === 'string') {
        const actualIds = docs.map(doc => doc.id);
        expect(actualIds).to.deep.equal(data);
      } else {
        docs.forEach(r => {
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
        nestedField: { 'level.1': { 'level.2': true } },
        embedding: vector([10, 1, 1, 1, 1, 1, 1, 1, 1, 1])
      },
      book2: {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        genre: 'Romance',
        published: 1813,
        rating: 4.5,
        tags: ['classic', 'social commentary', 'love'],
        awards: { none: true },
        embedding: vector([1, 10, 1, 1, 1, 1, 1, 1, 1, 1])
      },
      book3: {
        title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez',
        genre: 'Magical Realism',
        published: 1967,
        rating: 4.3,
        tags: ['family', 'history', 'fantasy'],
        awards: { nobel: true, nebula: false },
        embedding: vector([1, 1, 10, 1, 1, 1, 1, 1, 1, 1])
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
        cost: NaN,
        embedding: vector([1, 1, 1, 10, 1, 1, 1, 1, 1, 1])
      },
      book5: {
        title: "The Handmaid's Tale",
        author: 'Margaret Atwood',
        genre: 'Dystopian',
        published: 1985,
        rating: 4.1,
        tags: ['feminism', 'totalitarianism', 'resistance'],
        awards: { 'arthur c. clarke': true, 'booker prize': false },
        embedding: vector([1, 1, 1, 1, 10, 1, 1, 1, 1, 1])
      },
      book6: {
        title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky',
        genre: 'Psychological Thriller',
        published: 1866,
        rating: 4.3,
        tags: ['philosophy', 'crime', 'redemption'],
        awards: { none: true },
        embedding: vector([1, 1, 1, 1, 1, 10, 1, 1, 1, 1])
      },
      book7: {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        genre: 'Southern Gothic',
        published: 1960,
        rating: 4.2,
        tags: ['racism', 'injustice', 'coming-of-age'],
        awards: { pulitzer: true },
        embedding: vector([1, 1, 1, 1, 1, 1, 10, 1, 1, 1])
      },
      book8: {
        title: '1984',
        author: 'George Orwell',
        genre: 'Dystopian',
        published: 1949,
        rating: 4.2,
        tags: ['surveillance', 'totalitarianism', 'propaganda'],
        awards: { prometheus: true },
        embedding: vector([1, 1, 1, 1, 1, 1, 1, 10, 1, 1])
      },
      book9: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        genre: 'Modernist',
        published: 1925,
        rating: 4.0,
        tags: ['wealth', 'american dream', 'love'],
        awards: { none: true },
        embedding: vector([1, 1, 1, 1, 1, 1, 1, 1, 10, 1])
      },
      book10: {
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Science Fiction',
        published: 1965,
        rating: 4.6,
        tags: ['politics', 'desert', 'ecology'],
        awards: { hugo: true, nebula: true },
        embedding: vector([1, 1, 1, 1, 1, 1, 1, 1, 1, 10])
      }
    };
    return testCollectionWithDocs(bookDocs);
  }

  let testDeferred: Deferred<void> | undefined;
  let withTestCollectionPromise: Promise<unknown> | undefined;

  beforeEach(async () => {
    const setupDeferred = new Deferred<void>();
    testDeferred = new Deferred<void>();
    withTestCollectionPromise = withTestCollection(async collectionRef => {
      randomCol = collectionRef;
      firestore = collectionRef.firestore;
      await setupBookDocs();
      setupDeferred.resolve();

      return testDeferred?.promise;
    });

    await setupDeferred.promise;
  });

  afterEach(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
  });

  describe('pipeline results', () => {
    it('empty snapshot as expected', async () => {
      const snapshot = await execute(
        firestore.pipeline().collection(randomCol.path).limit(0)
      );
      expect(snapshot.results.length).to.equal(0);
    });

    it('full snapshot as expected', async () => {
      const ppl = firestore
        .pipeline()
        .collection(randomCol.path)
        .sort(ascending('__name__'));
      const snapshot = await execute(ppl);
      expect(snapshot.results.length).to.equal(10);
      expectResults(
        snapshot,
        'book1',
        'book10',
        'book2',
        'book3',
        'book4',
        'book5',
        'book6',
        'book7',
        'book8',
        'book9'
      );
    });

    it('result equals works', async () => {
      const ppl = firestore
        .pipeline()
        .collection(randomCol.path)
        .sort(ascending('title'))
        .limit(1);
      const snapshot1 = await execute(ppl);
      const snapshot2 = await execute(ppl);
      expect(snapshot1.results.length).to.equal(1);
      expect(snapshot2.results.length).to.equal(1);
      expect(pipelineResultEqual(snapshot1.results[0], snapshot2.results[0])).to
        .be.true;
    });

    it('returns execution time', async () => {
      const start = new Date().valueOf();
      const pipeline = firestore.pipeline().collection(randomCol.path);

      const snapshot = await execute(pipeline);
      const end = new Date().valueOf();

      expect(snapshot.executionTime.toDate().valueOf()).to.approximately(
        (start + end) / 2,
        timestampDeltaMS
      );
    });

    it('returns execution time for an empty query', async () => {
      const start = new Date().valueOf();
      const pipeline = firestore.pipeline().collection(randomCol.path).limit(0);

      const snapshot = await execute(pipeline);
      const end = new Date().valueOf();

      expect(snapshot.results.length).to.equal(0);

      expect(snapshot.executionTime.toDate().valueOf()).to.approximately(
        (start + end) / 2,
        timestampDeltaMS
      );
    });

    it('returns create and update time for each document', async () => {
      const pipeline = firestore.pipeline().collection(randomCol.path);

      let snapshot = await execute(pipeline);
      expect(snapshot.results.length).to.equal(10);
      snapshot.results.forEach(doc => {
        expect(doc.createTime).to.not.be.null;
        expect(doc.updateTime).to.not.be.null;

        expect(doc.createTime!.toDate().valueOf()).to.approximately(
          (beginDocCreation + endDocCreation) / 2,
          timestampDeltaMS
        );
        expect(doc.updateTime!.toDate().valueOf()).to.approximately(
          (beginDocCreation + endDocCreation) / 2,
          timestampDeltaMS
        );
        expect(doc.createTime?.valueOf()).to.equal(doc.updateTime?.valueOf());
      });

      const wb = writeBatch(firestore);
      snapshot.results.forEach(doc => {
        wb.update(doc.ref!, { newField: 'value' });
      });
      await wb.commit();

      snapshot = await execute(pipeline);
      expect(snapshot.results.length).to.equal(10);
      snapshot.results.forEach(doc => {
        expect(doc.createTime).to.not.be.null;
        expect(doc.updateTime).to.not.be.null;
        expect(doc.createTime!.toDate().valueOf()).to.be.lessThan(
          doc.updateTime!.toDate().valueOf()
        );
      });
    });

    it('returns execution time for an aggregate query', async () => {
      const start = new Date().valueOf();
      const pipeline = firestore
        .pipeline()
        .collection(randomCol.path)
        .aggregate(average('rating').as('avgRating'));

      const snapshot = await execute(pipeline);
      const end = new Date().valueOf();

      expect(snapshot.results.length).to.equal(1);

      expect(snapshot.executionTime.toDate().valueOf()).to.approximately(
        (start + end) / 2,
        timestampDeltaMS
      );
    });

    it('returns undefined create and update time for each result in an aggregate query', async () => {
      const pipeline = firestore
        .pipeline()
        .collection(randomCol.path)
        .aggregate({
          accumulators: [average('rating').as('avgRating')],
          groups: ['genre']
        });

      const snapshot = await execute(pipeline);

      expect(snapshot.results.length).to.equal(8);

      snapshot.results.forEach(doc => {
        expect(doc.updateTime).to.be.undefined;
        expect(doc.createTime).to.be.undefined;
      });
    });
  });

  describe('pipeline sources', () => {
    it('supports CollectionReference as source', async () => {
      const snapshot = await execute(
        firestore.pipeline().collection(randomCol)
      );
      expect(snapshot.results.length).to.equal(10);
    });

    it('supports list of documents as source', async () => {
      const collName = randomCol.id;

      const snapshot = await execute(
        firestore
          .pipeline()
          .documents([
            `${collName}/book1`,
            doc(randomCol, 'book2'),
            doc(randomCol, 'book3').path
          ])
      );
      expect(snapshot.results.length).to.equal(3);
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

    it('supports collection group as source', async () => {
      const randomSubCollectionId = Math.random().toString(16).slice(2);
      const doc1 = await addDoc(
        collection(randomCol, 'book1', randomSubCollectionId),
        { order: 1 }
      );
      const doc2 = await addDoc(
        collection(randomCol, 'book2', randomSubCollectionId),
        { order: 2 }
      );
      const snapshot = await execute(
        firestore
          .pipeline()
          .collectionGroup(randomSubCollectionId)
          .sort(ascending('order'))
      );
      expectResults(snapshot, doc1.id, doc2.id);
    });

    it('supports database as source', async () => {
      const randomId = Math.random().toString(16).slice(2);
      const doc1 = await addDoc(collection(randomCol, 'book1', 'sub'), {
        order: 1,
        randomId
      });
      const doc2 = await addDoc(collection(randomCol, 'book2', 'sub'), {
        order: 2,
        randomId
      });
      const snapshot = await execute(
        firestore
          .pipeline()
          .database()
          .where(equal('randomId', randomId))
          .sort(ascending('order'))
      );
      expectResults(snapshot, doc1.id, doc2.id);
    });

    it('can create pipeline from a query', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .createFrom(randomCol)
          .sort(field('__name__').ascending())
          .limit(1)
      );
      expectResults(snapshot, 'book1');
    });
  });

  describe('supported data types', () => {
    it('accepts and returns all data types', async () => {
      const refDate = new Date();
      const refTimestamp = Timestamp.now();
      const constants = [
        constant(1).as('number'),
        constant('a string').as('string'),
        constant(true).as('boolean'),
        constant(null).as('null'),
        constant(new GeoPoint(0.1, 0.2)).as('geoPoint'),
        constant(refTimestamp).as('timestamp'),
        constant(refDate).as('date'),
        constant(
          Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0]))
        ).as('bytes'),
        constant(doc(firestore, 'foo', 'bar')).as('documentReference'),
        constant(vector([1, 2, 3])).as('vectorValue'),
        map({
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
        array([
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

      const snapshots = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(constants[0], ...constants.slice(1))
      );

      expectResults(snapshots, {
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

    it('throws on undefined in a map', async () => {
      expect(() => {
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(
            map({
              'number': 1,
              undefined
            }).as('foo')
          );
      }).to.throw(
        'Function map() called with invalid data. Unsupported field value: undefined'
      );
    });

    it('throws on undefined in an array', async () => {
      expect(() => {
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(array([1, undefined]).as('foo'));
      }).to.throw(
        'Function array() called with invalid data. Unsupported field value: undefined'
      );
    });

    it('converts arrays and plain objects to functionValues if the customer intent is unspecified', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
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
              field('genre'),
              multiply('rating', 10),
              [field('title')],
              {
                published: field('published')
              }
            ]).as('metadataArray'),
            map({
              genre: field('genre'),
              rating: multiply('rating', 10),
              nestedArray: [field('title')],
              nestedMap: {
                published: field('published')
              }
            }).as('metadata')
          )
          .where(
            and(
              equal('metadataArray', [
                1,
                2,
                field('genre'),
                multiply('rating', 10),
                [field('title')],
                {
                  published: field('published')
                }
              ]),
              equal('metadata', {
                genre: field('genre'),
                rating: multiply('rating', 10),
                nestedArray: [field('title')],
                nestedMap: {
                  published: field('published')
                }
              })
            )
          )
      );

      expect(snapshot.results.length).to.equal(1);

      expectResults(snapshot, {
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

    it('supports boolean value constants as a BooleanExpression', async () => {
      const snapshots = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(
            conditional(constant(true), constant('TRUE'), constant('FALSE')).as(
              'true'
            ),
            conditional(
              constant(false),
              constant('TRUE'),
              constant('FALSE')
            ).as('false')
          )
      );

      expectResults(snapshots, {
        'true': 'TRUE',
        'false': 'FALSE'
      });
    });
  });

  describe('stages', () => {
    describe('aggregate stage', () => {
      it('supports aggregate', async () => {
        let snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(countAll().as('count'))
        );
        expectResults(snapshot, { count: 10 });

        snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('genre', 'Science Fiction'))
            .aggregate(
              countAll().as('count'),
              average('rating').as('avgRating'),
              maximum('rating').as('maxRating'),
              sum('rating').as('sumRating')
            )
        );
        expectResults(snapshot, {
          count: 2,
          avgRating: 4.4,
          maxRating: 4.6,
          sumRating: 8.8
        });
      });

      it('supports aggregate options', async () => {
        let snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate({
              accumulators: [countAll().as('count')]
            })
        );
        expectResults(snapshot, { count: 10 });

        snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('genre', 'Science Fiction'))
            .aggregate(
              countAll().as('count'),
              average('rating').as('avgRating'),
              maximum('rating').as('maxRating'),
              sum('rating').as('sumRating')
            )
        );
        expectResults(snapshot, {
          count: 2,
          avgRating: 4.4,
          maxRating: 4.6,
          sumRating: 8.8
        });
      });

      it('rejects groups without accumulators', async () => {
        await expect(
          execute(
            firestore
              .pipeline()
              .collection(randomCol.path)
              .where(lessThan('published', 1900))
              .aggregate({
                accumulators: [],
                groups: ['genre']
              })
          )
        ).to.be.rejected;
      });

      it('returns group and accumulate results', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(lessThan(field('published'), 1984))
            .aggregate({
              accumulators: [average('rating').as('avgRating')],
              groups: ['genre']
            })
            .where(greaterThan('avgRating', 4.3))
            .sort(field('avgRating').descending())
        );
        expectResults(
          snapshot,
          { avgRating: 4.7, genre: 'Fantasy' },
          { avgRating: 4.5, genre: 'Romance' },
          { avgRating: 4.4, genre: 'Science Fiction' }
        );
      });

      it('returns minimum, maximum, count, and countAll accumulations', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(
              count('cost').as('booksWithCost'),
              countAll().as('count'),
              maximum('rating').as('maxRating'),
              minimum('published').as('minPublished')
            )
        );
        expectResults(snapshot, {
          booksWithCost: 1,
          count: 10,
          maxRating: 4.7,
          minPublished: 1813
        });
      });

      it('returns countif accumulation', async () => {
        let snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(countIf(field('rating').greaterThan(4.3)).as('count'))
        );
        const expectedResults = {
          count: 3
        };
        expectResults(snapshot, expectedResults);

        snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(field('rating').greaterThan(4.3).countIf().as('count'))
        );
        expectResults(snapshot, expectedResults);
      });

      it('returns countDistinct accumulation', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(countDistinct('genre').as('distinctGenres'))
        );
        expectResults(snapshot, { distinctGenres: 8 });
      });
    });

    describe('distinct stage', () => {
      it('returns distinct values as expected', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .distinct('genre', 'author')
            .sort(field('genre').ascending(), field('author').ascending())
        );
        expectResults(
          snapshot,
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

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .distinct('genre', 'author')
            .sort({
              orderings: [
                field('genre').ascending(),
                field('author').ascending()
              ]
            })
        );
        expectResults(
          snapshot,
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
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .sort(field('author').ascending())
        );
        expectResults(
          snapshot,
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

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select({ selections: ['title', field('author').as('auth0r')] })
            .sort(field('auth0r').ascending())
            .limit(2)
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            auth0r: 'Douglas Adams'
          },
          { title: 'The Great Gatsby', auth0r: 'F. Scott Fitzgerald' }
        );
      });
    });

    describe('addField stage', () => {
      it('can add fields', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .addFields(constant('bar').as('foo'))
            .sort(field('author').ascending())
        );
        expectResults(
          snapshot,
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

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .addFields({
              fields: [constant('bar').as('foo')]
            })
            .sort(field('author').ascending())
        );
        expectResults(
          snapshot,
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

    describe('removeFields stage', () => {
      it('can remove fields', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .sort(field('author').ascending())
            .removeFields(field('author'))
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy"
          },
          {
            title: 'The Great Gatsby'
          },
          { title: 'Dune' },
          {
            title: 'Crime and Punishment'
          },
          {
            title: 'One Hundred Years of Solitude'
          },
          { title: '1984' },
          {
            title: 'To Kill a Mockingbird'
          },
          {
            title: 'The Lord of the Rings'
          },
          { title: 'Pride and Prejudice' },
          {
            title: "The Handmaid's Tale"
          }
        );
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author', 'genre')
            .sort(field('author').ascending())
            .removeFields({
              fields: [field('author'), 'genre']
            })
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy"
          },
          {
            title: 'The Great Gatsby'
          },
          { title: 'Dune' },
          {
            title: 'Crime and Punishment'
          },
          {
            title: 'One Hundred Years of Solitude'
          },
          { title: '1984' },
          {
            title: 'To Kill a Mockingbird'
          },
          {
            title: 'The Lord of the Rings'
          },
          { title: 'Pride and Prejudice' },
          {
            title: "The Handmaid's Tale"
          }
        );
      });
    });

    describe('findNearest stage', () => {
      it('can find nearest', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .sort(field('author').ascending())
            .removeFields(field('author'))
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy"
          },
          {
            title: 'The Great Gatsby'
          },
          { title: 'Dune' },
          {
            title: 'Crime and Punishment'
          },
          {
            title: 'One Hundred Years of Solitude'
          },
          { title: '1984' },
          {
            title: 'To Kill a Mockingbird'
          },
          {
            title: 'The Lord of the Rings'
          },
          { title: 'Pride and Prejudice' },
          {
            title: "The Handmaid's Tale"
          }
        );
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author', 'genre')
            .sort(field('author').ascending())
            .removeFields({
              fields: [field('author'), 'genre']
            })
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy"
          },
          {
            title: 'The Great Gatsby'
          },
          { title: 'Dune' },
          {
            title: 'Crime and Punishment'
          },
          {
            title: 'One Hundred Years of Solitude'
          },
          { title: '1984' },
          {
            title: 'To Kill a Mockingbird'
          },
          {
            title: 'The Lord of the Rings'
          },
          { title: 'Pride and Prejudice' },
          {
            title: "The Handmaid's Tale"
          }
        );
      });
    });

    describe('where stage', () => {
      it('where with and (2 conditions)', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              and(
                greaterThan('rating', 4.5),
                equalAny('genre', ['Science Fiction', 'Romance', 'Fantasy'])
              )
            )
        );
        expectResults(snapshot, 'book10', 'book4');
      });

      it('where with and (3 conditions)', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              and(
                greaterThan('rating', 4.5),
                equalAny('genre', ['Science Fiction', 'Romance', 'Fantasy']),
                lessThan('published', 1965)
              )
            )
        );
        expectResults(snapshot, 'book4');
      });

      it('where with or', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              or(
                equal('genre', 'Romance'),
                equal('genre', 'Dystopian'),
                equal('genre', 'Fantasy')
              )
            )
            .sort(ascending('title'))
            .select('title')
        );
        expectResults(
          snapshot,
          { title: '1984' },
          { title: 'Pride and Prejudice' },
          { title: "The Handmaid's Tale" },
          { title: 'The Lord of the Rings' }
        );
      });

      it('where with xor', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              xor(
                equal('genre', 'Romance'),
                equal('genre', 'Dystopian'),
                equal('genre', 'Fantasy'),
                equal('published', 1949)
              )
            )
            .select('title')
        );
        expectResults(
          snapshot,
          { title: 'Pride and Prejudice' },
          { title: 'The Lord of the Rings' },
          { title: "The Handmaid's Tale" }
        );
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where({
              condition: and(
                greaterThan('rating', 4.5),
                equalAny('genre', ['Science Fiction', 'Romance', 'Fantasy'])
              )
            })
        );
        expectResults(snapshot, 'book10', 'book4');
      });
    });

    describe('sort, offset, and limit stages', () => {
      it('supports sort, offset, and limits', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sort(field('author').ascending())
            .offset(5)
            .limit(3)
            .select('title', 'author')
        );
        expectResults(
          snapshot,
          { title: '1984', author: 'George Orwell' },
          { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
          { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' }
        );
      });

      it('sort, offset, and limit stages support options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sort({
              orderings: [field('author').ascending()]
            })
            .offset({ offset: 5 })
            .limit({ limit: 3 })
            .select('title', 'author')
        );
        expectResults(
          snapshot,
          { title: '1984', author: 'George Orwell' },
          { title: 'To Kill a Mockingbird', author: 'Harper Lee' },
          { title: 'The Lord of the Rings', author: 'J.R.R. Tolkien' }
        );
      });
    });

    describe('raw stage', () => {
      it('can select fields', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .rawStage('select', [
              {
                title: field('title'),
                metadata: {
                  author: field('author')
                }
              }
            ])
            .sort(field('author').ascending())
            .limit(1)
        );
        expectResults(snapshot, {
          metadata: {
            author: 'Frank Herbert'
          },
          title: 'Dune'
        });
      });

      it('can add fields', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sort(field('author').ascending())
            .limit(1)
            .select('title', 'author')
            .rawStage('add_fields', [
              {
                display: stringConcat('title', ' - ', field('author'))
              }
            ])
        );
        expectResults(snapshot, {
          title: "The Hitchhiker's Guide to the Galaxy",
          author: 'Douglas Adams',
          display: "The Hitchhiker's Guide to the Galaxy - Douglas Adams"
        });
      });

      it('can filter with where', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .rawStage('where', [field('author').equal('Douglas Adams')])
        );
        expectResults(snapshot, {
          title: "The Hitchhiker's Guide to the Galaxy",
          author: 'Douglas Adams'
        });
      });

      it('can limit, offset, and sort', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author')
            .rawStage('sort', [
              {
                direction: 'ascending',
                expression: field('author')
              }
            ])
            .rawStage('offset', [3])
            .rawStage('limit', [1])
        );
        expectResults(snapshot, {
          author: 'Fyodor Dostoevsky',
          title: 'Crime and Punishment'
        });
      });

      it('can perform aggregate query', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author', 'rating')
            .rawStage('aggregate', [
              { averageRating: field('rating').average() },
              {}
            ])
        );
        expectResults(snapshot, {
          averageRating: 4.3100000000000005
        });
      });

      it('can perform distinct query', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .select('title', 'author', 'rating')
            .rawStage('distinct', [{ rating: field('rating') }])
            .sort(field('rating').descending())
        );
        expectResults(
          snapshot,
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

      it('can perform FindNearest query', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol)
            .rawStage(
              'find_nearest',
              [
                field('embedding'),
                vector([10, 1, 2, 1, 1, 1, 1, 1, 1, 1]),
                'euclidean'
              ],
              {
                'distance_field': field('computedDistance'),
                limit: 2
              }
            )
            .select('title', 'computedDistance')
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            computedDistance: 1
          },
          {
            title: 'One Hundred Years of Solitude',
            computedDistance: 12.041594578792296
          }
        );
      });
    });

    describe('replaceWith stage', () => {
      it('run pipeline with replaceWith field name', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .replaceWith('awards')
        );
        expectResults(snapshot, {
          hugo: true,
          nebula: false,
          others: { unknown: { year: 1980 } }
        });
      });

      it('run pipeline with replaceWith Expr result', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .replaceWith(
              map({
                foo: 'bar',
                baz: {
                  title: field('title')
                }
              })
            )
        );
        expectResults(snapshot, {
          foo: 'bar',
          baz: { title: "The Hitchhiker's Guide to the Galaxy" }
        });
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .replaceWith({ map: 'awards' })
        );
        expectResults(snapshot, {
          hugo: true,
          nebula: false,
          others: { unknown: { year: 1980 } }
        });
      });
    });

    describe('sample stage', () => {
      it('run pipeline with sample limit of 3', async () => {
        const snapshot = await execute(
          firestore.pipeline().collection(randomCol.path).sample(3)
        );
        expect(snapshot.results.length).to.equal(3);
      });

      it('run pipeline with sample limit of {documents: 3}', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sample({ documents: 3 })
        );
        expect(snapshot.results.length).to.equal(3);
      });

      it('run pipeline with sample limit of {percentage: 0.6}', async () => {
        let avgSize = 0;
        const numIterations = 30;
        for (let i = 0; i < numIterations; i++) {
          const snapshot = await execute(
            firestore
              .pipeline()
              .collection(randomCol.path)
              .sample({ percentage: 0.6 })
          );

          avgSize += snapshot.results.length;
        }
        avgSize /= numIterations;
        expect(avgSize).to.be.closeTo(6, 1);
      });
    });

    describe('union stage', () => {
      it('run pipeline with union', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .union(firestore.pipeline().collection(randomCol.path))
            .sort(field(documentIdFieldPath()).ascending())
        );
        expectResults(
          snapshot,
          'book1',
          'book1',
          'book10',
          'book10',
          'book2',
          'book2',
          'book3',
          'book3',
          'book4',
          'book4',
          'book5',
          'book5',
          'book6',
          'book6',
          'book7',
          'book7',
          'book8',
          'book8',
          'book9',
          'book9'
        );
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .union({ other: firestore.pipeline().collection(randomCol.path) })
            .sort(field(documentIdFieldPath()).ascending())
        );
        expectResults(
          snapshot,
          'book1',
          'book1',
          'book10',
          'book10',
          'book2',
          'book2',
          'book3',
          'book3',
          'book4',
          'book4',
          'book5',
          'book5',
          'book6',
          'book6',
          'book7',
          'book7',
          'book8',
          'book8',
          'book9',
          'book9'
        );
      });
    });

    describe('unnest stage', () => {
      it('run pipeline with unnest', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .unnest(field('tags').as('tag'))
            .select(
              'title',
              'author',
              'genre',
              'published',
              'rating',
              'tags',
              'tag',
              'awards',
              'nestedField'
            )
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'comedy',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'space',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'adventure',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          }
        );
      });

      it('unnest with index field', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .unnest(field('tags').as('tag'), 'tagsIndex')
            .select(
              'title',
              'author',
              'genre',
              'published',
              'rating',
              'tags',
              'tag',
              'awards',
              'nestedField',
              'tagsIndex'
            )
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'comedy',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 0
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'space',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 1
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'adventure',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 2
          }
        );
      });

      it('unnest an expr', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .unnest(array([1, 2, 3]).as('copy'))
            .select(
              'title',
              'author',
              'genre',
              'published',
              'rating',
              'tags',
              'copy',
              'awards',
              'nestedField'
            )
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            copy: 1,
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            copy: 2,
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            copy: 3,
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } }
          }
        );
      });

      it('supports options', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(equal('title', "The Hitchhiker's Guide to the Galaxy"))
            .unnest({
              selectable: field('tags').as('tag'),
              indexField: 'tagsIndex'
            })
            .select(
              'title',
              'author',
              'genre',
              'published',
              'rating',
              'tags',
              'tag',
              'awards',
              'nestedField',
              'tagsIndex'
            )
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'comedy',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 0
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'space',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 1
          },
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            author: 'Douglas Adams',
            genre: 'Science Fiction',
            published: 1979,
            rating: 4.2,
            tags: ['comedy', 'space', 'adventure'],
            tag: 'adventure',
            awards: {
              hugo: true,
              nebula: false,
              others: { unknown: { year: 1980 } }
            },
            nestedField: { 'level.1': { 'level.2': true } },
            tagsIndex: 2
          }
        );
      });
    });

    describe('findNearest stage', () => {
      it('run pipeline with findNearest', async () => {
        const measures: Array<FindNearestStageOptions['distanceMeasure']> = [
          'euclidean',
          'dot_product',
          'cosine'
        ];
        for (const measure of measures) {
          const snapshot = await execute(
            firestore
              .pipeline()
              .collection(randomCol)
              .findNearest({
                field: 'embedding',
                vectorValue: vector([10, 1, 3, 1, 2, 1, 1, 1, 1, 1]),
                limit: 3,
                distanceMeasure: measure
              })
              .select('title')
          );
          expectResults(
            snapshot,
            {
              title: "The Hitchhiker's Guide to the Galaxy"
            },
            {
              title: 'One Hundred Years of Solitude'
            },
            {
              title: "The Handmaid's Tale"
            }
          );
        }
      });

      it('optionally returns the computed distance', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol)
            .findNearest({
              field: 'embedding',
              vectorValue: vector([10, 1, 2, 1, 1, 1, 1, 1, 1, 1]),
              limit: 2,
              distanceMeasure: 'euclidean',
              distanceField: 'computedDistance'
            })
            .select('title', 'computedDistance')
        );
        expectResults(
          snapshot,
          {
            title: "The Hitchhiker's Guide to the Galaxy",
            computedDistance: 1
          },
          {
            title: 'One Hundred Years of Solitude',
            computedDistance: 12.041594578792296
          }
        );
      });
    });
  });

  describe('error handling', () => {
    it('error properties are propagated from the firestore backend', async () => {
      try {
        const myPipeline = firestore
          .pipeline()
          .collection(randomCol.path)
          .rawStage('select', [
            // incorrect parameter type
            field('title')
          ]);

        await execute(myPipeline);

        expect.fail('expected pipeline.execute() to throw');
      } catch (e: unknown) {
        expect(e instanceof FirebaseError).to.be.true;
        const err = e as FirebaseError;
        // Backend returns the code as `failed-precondition` when using the REST transport
        expect(err['code']).to.equal('failed-precondition');
        expect(typeof err['message']).to.equal('string');

        expect(err['message']).to.match(
          /Request failed with error: Expected value type of MAP_VALUE when parsing 'fields' but received FIELD_REFERENCE_VALUE instead/
        );
      }
    });
  });

  describe('function expressions', () => {
    it('logical max works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(
            'title',
            logicalMaximum(constant(1960), field('published'), 1961).as(
              'published-safe'
            )
          )
          .sort(field('title').ascending())
          .limit(3)
      );
      expectResults(
        snapshot,
        { title: '1984', 'published-safe': 1961 },
        { title: 'Crime and Punishment', 'published-safe': 1961 },
        { title: 'Dune', 'published-safe': 1965 }
      );
    });

    it('logical min works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(
            'title',
            logicalMinimum(constant(1960), field('published'), 1961).as(
              'published-safe'
            )
          )
          .sort(field('title').ascending())
          .limit(3)
      );
      expectResults(
        snapshot,
        { title: '1984', 'published-safe': 1949 },
        { title: 'Crime and Punishment', 'published-safe': 1866 },
        { title: 'Dune', 'published-safe': 1960 }
      );
    });

    it('conditional works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(
            'title',
            conditional(
              lessThan(field('published'), 1960),
              constant(1960),
              field('published')
            ).as('published-safe'),
            field('rating')
              .greaterThanOrEqual(4.5)
              .conditional(constant('great'), constant('good'))
              .as('rating')
          )
          .sort(field('title').ascending())
          .limit(3)
      );
      expectResults(
        snapshot,
        { title: '1984', 'published-safe': 1960, rating: 'good' },
        {
          title: 'Crime and Punishment',
          'published-safe': 1960,
          rating: 'good'
        },
        { title: 'Dune', 'published-safe': 1965, rating: 'great' }
      );
    });

    it('equalAny works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(equalAny('published', [1979, 1999, 1967]))
          .sort(descending('title'))
          .select('title')
      );
      expectResults(
        snapshot,
        { title: "The Hitchhiker's Guide to the Galaxy" },
        { title: 'One Hundred Years of Solitude' }
      );
    });

    it('notEqualAny works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(
            notEqualAny(
              'published',
              [1965, 1925, 1949, 1960, 1866, 1985, 1954, 1967, 1979]
            )
          )
          .select('title')
      );
      expectResults(snapshot, { title: 'Pride and Prejudice' });
    });

    it('arrayContains works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(arrayContains('tags', 'comedy'))
          .select('title')
      );
      expectResults(snapshot, {
        title: "The Hitchhiker's Guide to the Galaxy"
      });
    });

    it('arrayContainsAny works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(arrayContainsAny('tags', ['comedy', 'classic']))
          .sort(descending('title'))
          .select('title')
      );
      expectResults(
        snapshot,
        { title: "The Hitchhiker's Guide to the Galaxy" },
        { title: 'Pride and Prejudice' }
      );
    });

    it('arrayContainsAll works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(arrayContainsAll('tags', ['adventure', 'magic']))
          .select('title')
      );
      expectResults(snapshot, { title: 'The Lord of the Rings' });
    });

    it('arrayLength works', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(arrayLength('tags').as('tagsCount'))
          .where(equal('tagsCount', 3))
      );
      expect(snapshot.results.length).to.equal(10);
    });

    it('testStrConcat', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(ascending('author'))
          .select(
            field('author').stringConcat(' - ', field('title')).as('bookInfo')
          )
          .limit(1)
      );
      expectResults(snapshot, {
        bookInfo: "Douglas Adams - The Hitchhiker's Guide to the Galaxy"
      });
    });

    it('testStartsWith', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(startsWith('title', 'The'))
          .select('title')
          .sort(field('title').ascending())
      );
      expectResults(
        snapshot,
        { title: 'The Great Gatsby' },
        { title: "The Handmaid's Tale" },
        { title: "The Hitchhiker's Guide to the Galaxy" },
        { title: 'The Lord of the Rings' }
      );
    });

    it('testEndsWith', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(endsWith('title', 'y'))
          .select('title')
          .sort(field('title').descending())
      );
      expectResults(
        snapshot,
        { title: "The Hitchhiker's Guide to the Galaxy" },
        { title: 'The Great Gatsby' }
      );
    });

    it('testStrContains', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(stringContains('title', "'s"))
          .select('title')
          .sort(field('title').ascending())
      );
      expectResults(
        snapshot,
        { title: "The Handmaid's Tale" },
        { title: "The Hitchhiker's Guide to the Galaxy" }
      );
    });

    it('testLength', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(charLength('title').as('titleLength'), field('title'))
          .where(greaterThan('titleLength', 20))
          .sort(field('title').ascending())
      );

      expectResults(
        snapshot,

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
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(like('title', '%Guide%'))
          .select('title')
      );
      expectResults(snapshot, {
        title: "The Hitchhiker's Guide to the Galaxy"
      });
    });

    it('testRegexContains', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(regexContains('title', '(?i)(the|of)'))
      );
      expect(snapshot.results.length).to.equal(5);
    });

    it('testRegexFind', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(regexFind('title', '^\\w+').as('firstWordInTitle'))
          .select('firstWordInTitle')
          .sort(field('firstWordInTitle').ascending())
          .limit(3)
      );
      expectResults(
        snapshot,
        { firstWordInTitle: '1984' },
        { firstWordInTitle: 'Crime' },
        { firstWordInTitle: 'Dune' }
      );
    });

    it('testRegexFindAll', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(regexFindAll('title', '\\w+').as('wordsInTitle'))
          .select('wordsInTitle')
          .sort(field('wordsInTitle').ascending())
          .limit(3)
      );
      expectResults(
        snapshot,
        { wordsInTitle: ['1984'] },
        { wordsInTitle: ['Crime', 'and', 'Punishment'] },
        { wordsInTitle: ['Dune'] }
      );
    });

    it('testRegexMatches', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(regexMatch('title', '.*(?i)(the|of).*'))
      );
      expect(snapshot.results.length).to.equal(5);
    });

    it('testArithmeticOperations', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(equal('title', 'To Kill a Mockingbird'))
          .select(
            add(field('rating'), 1).as('ratingPlusOne'),
            subtract(field('published'), 1900).as('yearsSince1900'),
            field('rating').multiply(10).as('ratingTimesTen'),
            divide('rating', 2).as('ratingDividedByTwo'),
            multiply('rating', 20).as('ratingTimes20'),
            add('rating', 3).as('ratingPlus3'),
            mod('rating', 2).as('ratingMod2')
          )
          .limit(1)
      );
      expectResults(snapshot, {
        ratingPlusOne: 5.2,
        yearsSince1900: 60,
        ratingTimesTen: 42,
        ratingDividedByTwo: 2.1,
        ratingTimes20: 84,
        ratingPlus3: 7.2,
        ratingMod2: 0.20000000000000018
      });
    });

    it('testComparisonOperators', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(
            and(
              greaterThan('rating', 4.2),
              lessThanOrEqual(field('rating'), 4.5),
              notEqual('genre', 'Science Fiction')
            )
          )
          .select('rating', 'title')
          .sort(field('title').ascending())
      );
      expectResults(
        snapshot,
        { rating: 4.3, title: 'Crime and Punishment' },
        {
          rating: 4.3,
          title: 'One Hundred Years of Solitude'
        },
        { rating: 4.5, title: 'Pride and Prejudice' }
      );
    });

    it('testLogicalOperators', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(
            or(
              and(
                greaterThan('rating', 4.5),
                equal('genre', 'Science Fiction')
              ),
              lessThan('published', 1900)
            )
          )
          .select('title')
          .sort(field('title').ascending())
      );
      expectResults(
        snapshot,
        { title: 'Crime and Punishment' },
        { title: 'Dune' },
        { title: 'Pride and Prejudice' }
      );
    });

    it('testChecks', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            equal('rating', null).as('ratingIsNull'),
            equal('rating', NaN).as('ratingIsNaN'),
            isError(divide(constant(1), constant(0))).as('isError'),
            ifError(divide(constant(1), constant(0)), constant('was error')).as(
              'ifError'
            ),
            ifError(
              divide(constant(1), constant(0)).greaterThan(1),
              constant(true)
            )
              .not()
              .as('ifErrorBooleanExpression'),
            isAbsent('foo').as('isAbsent'),
            notEqual('title', null).as('titleIsNotNull'),
            notEqual('cost', NaN).as('costIsNotNan'),
            exists('fooBarBaz').as('fooBarBazExists'),
            field('title').exists().as('titleExists')
          )
      );
      expectResults(snapshot, {
        ratingIsNull: false,
        ratingIsNaN: false,
        isError: true,
        ifError: 'was error',
        ifErrorBooleanExpression: false,
        isAbsent: true,
        titleIsNotNull: true,
        costIsNotNan: false,
        fooBarBazExists: false,
        titleExists: true
      });

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            field('rating').equal(null).as('ratingIsNull'),
            field('rating').equal(NaN).as('ratingIsNaN'),
            divide(constant(1), constant(0)).isError().as('isError'),
            divide(constant(1), constant(0))
              .ifError(constant('was error'))
              .as('ifError'),
            divide(constant(1), constant(0))
              .greaterThan(1)
              .ifError(constant(true))
              .not()
              .as('ifErrorBooleanExpression'),
            field('foo').isAbsent().as('isAbsent'),
            field('title').notEqual(null).as('titleIsNotNull'),
            field('cost').notEqual(NaN).as('costIsNotNan')
          )
      );
      expectResults(snapshot, {
        ratingIsNull: false,
        ratingIsNaN: false,
        isError: true,
        ifError: 'was error',
        ifErrorBooleanExpression: false,
        isAbsent: true,
        titleIsNotNull: true,
        costIsNotNan: false
      });
    });

    it('testMapGet', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('published').descending())
          .select(
            field('awards').mapGet('hugo').as('hugoAward'),
            field('awards').mapGet('others').as('others'),
            field('title')
          )
          .where(equal('hugoAward', true))
      );
      expectResults(
        snapshot,
        {
          hugoAward: true,
          title: "The Hitchhiker's Guide to the Galaxy",
          others: { unknown: { year: 1980 } }
        },
        { hugoAward: true, title: 'Dune' }
      );
    });

    it('testDistanceFunctions', async () => {
      const sourceVector = vector([0.1, 0.1]);
      const targetVector = vector([0.5, 0.8]);
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(
            cosineDistance(constant(sourceVector), targetVector).as(
              'cosineDistance'
            ),
            dotProduct(constant(sourceVector), targetVector).as(
              'dotProductDistance'
            ),
            euclideanDistance(constant(sourceVector), targetVector).as(
              'euclideanDistance'
            )
          )
          .limit(1)
      );

      expectResults(snapshot, {
        cosineDistance: 0.02560880430538015,
        dotProductDistance: 0.13,
        euclideanDistance: 0.806225774829855
      });

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(
            constant(sourceVector)
              .cosineDistance(targetVector)
              .as('cosineDistance'),
            constant(sourceVector)
              .dotProduct(targetVector)
              .as('dotProductDistance'),
            constant(sourceVector)
              .euclideanDistance(targetVector)
              .as('euclideanDistance')
          )
          .limit(1)
      );

      expectResults(snapshot, {
        cosineDistance: 0.02560880430538015,
        dotProductDistance: 0.13,
        euclideanDistance: 0.806225774829855
      });
    });

    it('testVectorLength', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(vectorLength(constant(vector([1, 2, 3]))).as('vectorLength'))
      );
      expectResults(snapshot, {
        vectorLength: 3
      });
    });

    it('testNestedFields', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(equal('awards.hugo', true))
          .sort(descending('title'))
          .select('title', 'awards.hugo')
      );
      expectResults(
        snapshot,
        {
          title: "The Hitchhiker's Guide to the Galaxy",
          'awards.hugo': true
        },
        { title: 'Dune', 'awards.hugo': true }
      );
    });

    it('test mapGet with field name including . notation', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              title: 'foo',
              nested: {
                level: {
                  '1': 'bar'
                },
                'level.1': {
                  'level.2': 'baz'
                }
              }
            })
          )
          .select(
            'title',
            field('nested.level.1'),
            mapGet('nested', 'level.1').mapGet('level.2').as('nested')
          )
      );
      expectResults(snapshot, {
        title: 'foo',
        'nested.level.`1`': 'bar',
        nested: 'baz'
      });
    });

    describe('rawFunction', () => {
      it('add selectable', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sort(descending('rating'))
            .limit(1)
            .select(
              new FunctionExpression('add', [field('rating'), constant(1)]).as(
                'rating'
              )
            )
        );
        expectResults(snapshot, {
          rating: 5.7
        });
      });

      it('and (variadic) selectable', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              new FunctionExpression('and', [
                field('rating').greaterThan(0),
                field('title').charLength().lessThan(5),
                field('tags').arrayContains('propaganda')
              ]).asBoolean()
            )
            .select('title')
        );
        expectResults(snapshot, {
          title: '1984'
        });
      });

      it('array contains any', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .where(
              new FunctionExpression('array_contains_any', [
                field('tags'),
                array(['politics'])
              ]).asBoolean()
            )
            .select('title')
        );
        expectResults(snapshot, {
          title: 'Dune'
        });
      });

      it('countif aggregate', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .aggregate(
              new AggregateFunction('count_if', [
                field('rating').greaterThanOrEqual(4.5)
              ]).as('countOfBest')
            )
        );
        expectResults(snapshot, {
          countOfBest: 3
        });
      });

      it('sort by char_len', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .sort(
              new FunctionExpression('char_length', [
                field('title')
              ]).ascending(),
              descending('__name__')
            )
            .limit(3)
            .select('title')
        );
        expectResults(
          snapshot,
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

    it('supports array', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(array([1, 2, 3, 4]).as('metadata'))
      );
      expect(snapshot.results.length).to.equal(1);
      expectResults(snapshot, {
        metadata: [1, 2, 3, 4]
      });
    });

    it('evaluates expression in array', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            array([1, 2, field('genre'), multiply('rating', 10)]).as('metadata')
          )
      );
      expect(snapshot.results.length).to.equal(1);
      expectResults(snapshot, {
        metadata: [1, 2, 'Fantasy', 47]
      });
    });

    it('supports arrayGet', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(arrayGet('tags', 0).as('firstTag'))
      );
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
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(field('tags').arrayGet(0).as('firstTag'))
      );
      expectResults(snapshot, ...expectedResults);
    });

    it('supports arrayFirst', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(arrayFirst('tags').as('firstTag'))
      );
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
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(field('tags').arrayFirst().as('firstTag'))
      );
      expectResults(snapshot, ...expectedResults);
    });

    it('supports arrayFirstN', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(arrayFirstN('tags', 2).as('firstTwoTags'))
      );
      const expectedResults = [
        {
          firstTwoTags: ['adventure', 'magic']
        },
        {
          firstTwoTags: ['politics', 'desert']
        },
        {
          firstTwoTags: ['classic', 'social commentary']
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(field('tags').arrayFirstN(2).as('firstTwoTags'))
      );
      expectResults(snapshot, ...expectedResults);

      // Test with empty/null/non-existent
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              empty: [],
              nullVal: null
            })
          )
          .select(
            arrayFirstN('empty', 1).as('emptyResult'),
            arrayFirstN('nullVal', 1).as('nullResult'),
            arrayFirstN('nonExistent', 1).as('absentResult')
          )
      );

      expectResults(snapshot, {
        emptyResult: [],
        nullResult: null,
        absentResult: null
      });
    });

    it('supports arrayLast', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(arrayLast('tags').as('lastTag'))
      );
      const expectedResults = [
        {
          lastTag: 'epic'
        },
        {
          lastTag: 'ecology'
        },
        {
          lastTag: 'love'
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(field('tags').arrayLast().as('lastTag'))
      );
      expectResults(snapshot, ...expectedResults);
    });

    it('supports arrayLastN', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(arrayLastN('tags', 2).as('lastTwoTags'))
      );
      const expectedResults = [
        {
          lastTwoTags: ['magic', 'epic']
        },
        {
          lastTwoTags: ['desert', 'ecology']
        },
        {
          lastTwoTags: ['social commentary', 'love']
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(3)
          .select(field('tags').arrayLastN(2).as('lastTwoTags'))
      );
      expectResults(snapshot, ...expectedResults);

      // Test with empty/null/non-existent
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              empty: [],
              nullVal: null
            })
          )
          .select(
            arrayLastN('empty', 1).as('emptyResult'),
            arrayLastN('nullVal', 1).as('nullResult'),
            arrayLastN('nonExistent', 1).as('absentResult')
          )
      );

      expectResults(snapshot, {
        emptyResult: [],
        nullResult: null,
        absentResult: null
      });
    });

    it('supports arrayMaximum', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(arrayMaximum('tags').as('maxTag'))
      );
      const expectedResults = [
        {
          maxTag: 'magic'
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('tags').arrayMaximum().as('maxTag'))
      );
      expectResults(snapshot, ...expectedResults);

      // Test with empty/null/non-existent and mixed types
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              empty: [],
              nullVal: null,
              mixed: [1, '2', 3, '10'] // Strings > Numbers in Firestore
            })
          )
          .select(
            arrayMaximum('empty').as('emptyResult'),
            arrayMaximum('nullVal').as('nullResult'),
            arrayMaximum('nonExistent').as('absentResult'),
            arrayMaximum('mixed').as('mixedResult')
          )
      );

      expectResults(snapshot, {
        emptyResult: null,
        nullResult: null,
        absentResult: null,
        mixedResult: '2' // "2" > "10" > 3 > 1
      });
    });

    it('supports arrayMaximumN', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(arrayMaximumN('tags', 2).as('maxTwoTags'))
      );
      const expectedResults = [
        {
          maxTwoTags: ['magic', 'epic']
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('tags').arrayMaximumN(2).as('maxTwoTags'))
      );
      expectResults(snapshot, ...expectedResults);
    });

    it('supports arrayMinimum', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(arrayMinimum('tags').as('minTag'))
      );
      const expectedResults = [
        {
          minTag: 'adventure'
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('tags').arrayMinimum().as('minTag'))
      );
      expectResults(snapshot, ...expectedResults);

      // Test with empty/null/non-existent and mixed types
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              empty: [],
              nullVal: null,
              mixed: [1, '2', 3, '10'] // Strings > Numbers in Firestore
            })
          )
          .select(
            arrayMinimum('empty').as('emptyResult'),
            arrayMinimum('nullVal').as('nullResult'),
            arrayMinimum('nonExistent').as('absentResult'),
            arrayMinimum('mixed').as('mixedResult')
          )
      );

      expectResults(snapshot, {
        emptyResult: null,
        nullResult: null,
        absentResult: null,
        mixedResult: 1 // 1 < 3 < "10" < "2"
      });
    });

    it('supports arrayMinimumN', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(arrayMinimumN('tags', 2).as('minTwoTags'))
      );
      const expectedResults = [
        {
          minTwoTags: ['adventure', 'epic']
        }
      ];
      expectResults(snapshot, ...expectedResults);

      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('tags').arrayMinimumN(2).as('minTwoTags'))
      );
      expectResults(snapshot, ...expectedResults);
    });

    it('supports arraySlice', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            arraySlice('tags', 0, 1).as('slice1'), // inclusive start and end
            arraySlice('tags', 1, 100).as('slice2'), // overflow end
            arraySlice('tags', 1).as('slice3'), // slice to end
            field('tags').arraySlice(1, 2).as('slice4'), // class method
            arraySlice('empty', 0, 1).as('sliceEmpty') // null array
          )
      );

      const expectedResults = [
        {
          slice1: ['adventure', 'magic'],
          slice2: ['magic', 'epic'],
          slice3: ['magic', 'epic'],
          slice4: ['magic', 'epic'],
          sliceEmpty: null
        }
      ];
      expectResults(snapshot, ...expectedResults);

      // Test with expressions
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            arraySlice('tags', field('tags').arrayLength().subtract(2)).as(
              'slice'
            )
          )
      );
      // length of tags is 3. slice(1) -> ['magic', 'epic']
      expectResults(snapshot, {
        slice: ['magic', 'epic']
      });
    });

    it('supports arrayIndexOf', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            arrayIndexOf('tags', 'adventure').as('indexFirst'),
            arrayIndexOf(field('tags'), 'magic').as('indexSecond'),
            field('tags').arrayIndexOf('adventure').as('indexFirst2'),
            arrayIndexOf('tags', 'nonexistent').as('indexNone'),
            arrayIndexOf('empty', 'anything').as('indexEmpty')
          )
      );

      const expectedResults = [
        {
          indexFirst: 0,
          indexSecond: 1,
          indexFirst2: 0,
          indexNone: -1,
          indexEmpty: null
        }
      ];
      expectResults(snapshot, ...expectedResults);

      // Test with duplicate values
      const snapshotDuplicates = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              arr: [1, 2, 3, 2, 1]
            })
          )
          .select(
            arrayIndexOf('arr', 2).as('firstIndex'),
            arrayLastIndexOf('arr', 2).as('lastIndex')
          )
      );

      expectResults(snapshotDuplicates, {
        firstIndex: 1,
        lastIndex: 3
      });
    });

    it('supports arrayLastIndexOf', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            arrayLastIndexOf('tags', 'adventure').as('lastIndexFirst'),
            arrayLastIndexOf(field('tags'), 'epic').as('lastIndexLast'),
            field('tags').arrayLastIndexOf('adventure').as('lastIndexFirst2'),
            arrayLastIndexOf('tags', 'nonexistent').as('lastIndexNone'),
            arrayLastIndexOf('empty', 'anything').as('lastIndexEmpty')
          )
      );

      const expectedResults = [
        {
          lastIndexFirst: 0,
          lastIndexLast: 2,
          lastIndexFirst2: 0,
          lastIndexNone: -1,
          lastIndexEmpty: null
        }
      ];
      expectResults(snapshot, ...expectedResults);

      // Test with duplicate values
      const snapshotDuplicates = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              arr: [1, 2, 3, 2, 1]
            })
          )
          .select(
            arrayIndexOf('arr', 2).as('firstIndex'),
            arrayLastIndexOf('arr', 2).as('lastIndex')
          )
      );

      expectResults(snapshotDuplicates, {
        firstIndex: 1,
        lastIndex: 3
      });
    });

    it('supports arrayIndexOfAll', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            arrayIndexOfAll('tags', 'adventure').as('indicesFirst'), // [0]
            arrayIndexOfAll(field('tags'), 'epic').as('indicesLast'), // [2]
            field('tags').arrayIndexOfAll('nonexistent').as('indicesNone'), // []
            arrayIndexOfAll('empty', 'anything').as('indicesEmpty') // []
          )
      );

      const expectedResults = [
        {
          indicesFirst: [0],
          indicesLast: [2],
          indicesNone: [],
          indicesEmpty: null
        }
      ];
      expectResults(snapshot, ...expectedResults);

      // Test with duplicate values
      const snapshotDuplicates = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              arr: [1, 2, 3, 2, 1]
            })
          )
          .select(
            arrayIndexOfAll('arr', 1).as('indices1'),
            arrayIndexOfAll('arr', 2).as('indices2')
          )
      );

      expectResults(snapshotDuplicates, {
        indices1: [0, 4],
        indices2: [1, 3]
      });
    });

    describe('arrayFilter', () => {
      it('supports arrayFilter simple', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .limit(1)
            .replaceWith(
              map({
                arr: [1, 2, 3, 4, 5],
                arr2: [10, 20],
                empty: [],
                nullArr: null,
                notArr: [1, 2, 3, 4, 5]
              })
            )
            .select(
              field('arr')
                .arrayFilter('element', field('element').greaterThan(3))
                .as('result1'),
              arrayFilter(
                'arr2',
                'element',
                field('element').greaterThan(3)
              ).as('result2'),
              arrayFilter(
                'empty',
                'element',
                field('element').greaterThan(3)
              ).as('result3'),
              arrayFilter(
                'nullArr',
                'element',
                field('element').greaterThan(3)
              ).as('result4')
            )
        );

        expectResults(snapshot, {
          result1: [4, 5],
          result2: [10, 20],
          result3: [],
          result4: null
        });
      });

      it('supports arrayFilter on map property', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .limit(1)
            .replaceWith(
              map({
                arr: [{ a: { b: 1 } }, { a: { b: 2 } }, { a: { b: 3 } }]
              })
            )
            .select(
              arrayFilter('arr', 'element', field('element.a.b').equal(2)).as(
                'result'
              )
            )
        );

        expectResults(snapshot, {
          result: [{ a: { b: 2 } }]
        });
      });

      it('supports arrayFilter nested child references parent', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .limit(1)
            .replaceWith(
              map({
                arr: [
                  { outerVal: 2, innerArr: [1, 2, 3] },
                  { outerVal: 5, innerArr: [4, 5, 6] },
                  { outerVal: 9, innerArr: [7, 8] }
                ]
              })
            )
            .select(
              arrayFilter(
                field('arr'),
                'parent',
                field('parent.innerArr')
                  .arrayFilter(
                    'child',
                    field('child').equal(field('parent.outerVal'))
                  )
                  .length()
                  .greaterThan(0)
              ).as('result')
            )
        );

        expectResults(snapshot, {
          result: [
            { outerVal: 2, innerArr: [1, 2, 3] },
            { outerVal: 5, innerArr: [4, 5, 6] }
          ]
        });
      });

      it('supports arrayFilter nested child references other fields', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .limit(1)
            .replaceWith(
              map({
                otherField: 2,
                arr: [{ nested: [1, 2, 3] }, { nested: [4, 5, 6] }]
              })
            )
            .select(
              field('__name__'),
              arrayFilter(
                field('arr'),
                'outer',
                arrayContains(
                  arrayFilter(
                    field('outer.nested'),
                    'inner',
                    field('otherField').equal(constant(2))
                  ),
                  constant(1)
                )
              ).as('result')
            )
        );

        expectResults(snapshot, {
          result: [{ nested: [1, 2, 3] }]
        });
      });

      it('supports arrayFilter edge case missing property in map', async () => {
        const snapshot = await execute(
          firestore
            .pipeline()
            .collection(randomCol.path)
            .limit(1)
            .replaceWith(
              map({
                arr: [{ a: 1 }, { b: 2 }, { a: 3 }]
              })
            )
            .select(
              arrayFilter(
                'arr',
                'element',
                field('element.a').greaterThan(1)
              ).as('result')
            )
        );

        expectResults(snapshot, {
          result: [{ a: 3 }]
        });
      });
    });

    it('supports map', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            map({
              foo: 'bar'
            }).as('metadata')
          )
      );

      expect(snapshot.results.length).to.equal(1);
      expectResults(snapshot, {
        metadata: {
          foo: 'bar'
        }
      });
    });

    it('evaluates expression in map', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            map({
              genre: field('genre'),
              rating: field('rating').multiply(10)
            }).as('metadata')
          )
      );

      expect(snapshot.results.length).to.equal(1);
      expectResults(snapshot, {
        metadata: {
          genre: 'Fantasy',
          rating: 47
        }
      });
    });

    it('supports mapRemove', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(mapRemove('awards', 'hugo').as('awards'))
      );
      expectResults(snapshot, {
        awards: { nebula: false }
      });
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('awards').mapRemove('hugo').as('awards'))
      );
      expectResults(snapshot, {
        awards: { nebula: false }
      });
    });

    it('supports mapMerge', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(mapMerge('awards', { fakeAward: true }).as('awards'))
      );
      expectResults(snapshot, {
        awards: { nebula: false, hugo: false, fakeAward: true }
      });
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('awards').mapMerge({ fakeAward: true }).as('awards'))
      );
      expectResults(snapshot, {
        awards: { nebula: false, hugo: false, fakeAward: true }
      });
    });

    it('supports timestamp conversions', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(
            unixSecondsToTimestamp(constant(1741380235)).as(
              'unixSecondsToTimestamp'
            ),
            unixMillisToTimestamp(constant(1741380235123)).as(
              'unixMillisToTimestamp'
            ),
            unixMicrosToTimestamp(constant(1741380235123456)).as(
              'unixMicrosToTimestamp'
            ),
            timestampToUnixSeconds(
              constant(new Timestamp(1741380235, 123456789))
            ).as('timestampToUnixSeconds'),
            timestampToUnixMicros(
              constant(new Timestamp(1741380235, 123456789))
            ).as('timestampToUnixMicros'),
            timestampToUnixMillis(
              constant(new Timestamp(1741380235, 123456789))
            ).as('timestampToUnixMillis')
          )
      );
      expectResults(snapshot, {
        unixMicrosToTimestamp: new Timestamp(1741380235, 123456000),
        unixMillisToTimestamp: new Timestamp(1741380235, 123000000),
        unixSecondsToTimestamp: new Timestamp(1741380235, 0),
        timestampToUnixSeconds: 1741380235,
        timestampToUnixMicros: 1741380235123456,
        timestampToUnixMillis: 1741380235123
      });
    });

    it('supports timestamp math', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(constant(new Timestamp(1741380235, 0)).as('timestamp'))
          .select(
            timestampAdd('timestamp', 'day', 10).as('plus10days'),
            timestampAdd('timestamp', 'hour', 10).as('plus10hours'),
            timestampAdd('timestamp', 'minute', 10).as('plus10minutes'),
            timestampAdd('timestamp', 'second', 10).as('plus10seconds'),
            timestampAdd('timestamp', 'microsecond', 10).as('plus10micros'),
            timestampAdd('timestamp', 'millisecond', 10).as('plus10millis'),
            timestampSubtract('timestamp', 'day', 10).as('minus10days'),
            timestampSubtract('timestamp', 'hour', 10).as('minus10hours'),
            timestampSubtract('timestamp', 'minute', 10).as('minus10minutes'),
            timestampSubtract('timestamp', 'second', 10).as('minus10seconds'),
            timestampSubtract('timestamp', 'microsecond', 10).as(
              'minus10micros'
            ),
            timestampSubtract('timestamp', 'millisecond', 10).as(
              'minus10millis'
            )
          )
      );
      expectResults(snapshot, {
        plus10days: new Timestamp(1742244235, 0),
        plus10hours: new Timestamp(1741416235, 0),
        plus10minutes: new Timestamp(1741380835, 0),
        plus10seconds: new Timestamp(1741380245, 0),
        plus10micros: new Timestamp(1741380235, 10000),
        plus10millis: new Timestamp(1741380235, 10000000),
        minus10days: new Timestamp(1740516235, 0),
        minus10hours: new Timestamp(1741344235, 0),
        minus10minutes: new Timestamp(1741379635, 0),
        minus10seconds: new Timestamp(1741380225, 0),
        minus10micros: new Timestamp(1741380234, 999990000),
        minus10millis: new Timestamp(1741380234, 990000000)
      });
    }).timeout(10000);

    it('supports byteLength', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol)
          .limit(1)
          .select(
            constant(
              Bytes.fromUint8Array(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 0]))
            ).as('bytes')
          )
          .select(byteLength('bytes').as('byteLength'))
      );

      expectResults(snapshot, {
        byteLength: 8
      });
    });

    it('supports not', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol)
          .limit(1)
          .select(constant(true).as('trueField'))
          .select('trueField', not(equal('trueField', true)).as('falseField'))
      );

      expectResults(snapshot, {
        trueField: true,
        falseField: false
      });
    });

    it('can reverse an array', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('tags').arrayReverse().as('reversedTags'))
      );
      expectResults(snapshot, {
        reversedTags: ['adventure', 'space', 'comedy']
      });
    });

    it('can reverse an array with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(reverse('tags').as('reversedTags'))
      );
      expectResults(snapshot, {
        reversedTags: ['adventure', 'space', 'comedy']
      });
    });

    it('can compute the ceiling of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').ceil().as('ceilingRating'))
      );
      expectResults(snapshot, {
        ceilingRating: 5
      });
    });

    it('can compute the ceiling of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(ceil('rating').as('ceilingRating'))
      );
      expectResults(snapshot, {
        ceilingRating: 5
      });
    });

    it('can compute the floor of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').floor().as('floorRating'))
      );
      expectResults(snapshot, {
        floorRating: 4
      });
    });

    it('can compute the floor of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(floor('rating').as('floorRating'))
      );
      expectResults(snapshot, {
        floorRating: 4
      });
    });

    it('can compute e to the power of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .select(field('rating').exp().as('expRating'))
      );
      expect(snapshot.results[0].get('expRating')).to.be.approximately(
        109.94717245212352,
        0.00001
      );
    });

    it('can compute e to the power of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .select(exp('rating').as('expRating'))
      );
      expect(snapshot.results[0].get('expRating')).to.be.approximately(
        109.94717245212351,
        0.000001
      );
    });

    it('can compute the power of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').pow(2).as('powerRating'))
      );
      expect(snapshot.results[0].get('powerRating')).to.be.approximately(
        17.64,
        0.0001
      );
    });

    it('can compute the power of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(pow('rating', 2).as('powerRating'))
      );
      expect(snapshot.results[0].get('powerRating')).to.be.approximately(
        17.64,
        0.0001
      );
    });

    it('can round a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').round().as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: 4
      });
    });

    it('can round a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(round('rating').as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: 4
      });
    });

    it('can round a numeric value away from zero for positive half-way values', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .addFields(constant(1.5).as('positiveHalf'))
          .select(field('positiveHalf').round().as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: 2
      });
    });

    it('can round a numeric value away from zero for negative half-way values', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .addFields(constant(-1.5).as('negativeHalf'))
          .select(field('negativeHalf').round().as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: -2
      });
    });

    it('can round a numeric value to specified precision', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              foo: 4.123456
            })
          )
          .select(
            field('foo').round(0).as('0'),
            round('foo', 1).as('1'),
            round('foo', constant(2)).as('2'),
            round(field('foo'), 4).as('4')
          )
      );
      expectResults(snapshot, {
        '0': 4,
        '1': 4.1,
        '2': 4.12,
        '4': 4.1235
      });
    });

    it('can get the collectionId from a path', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(field('__name__').collectionId().as('collectionId'))
      );
      expectResults(snapshot, {
        collectionId: randomCol.id
      });
    });

    it('can get the collectionId from a path with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(collectionId('__name__').as('collectionId'))
      );
      expectResults(snapshot, {
        collectionId: randomCol.id
      });
    });

    it('can compute the length of a string value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('title').length().as('titleLength'))
      );
      expectResults(snapshot, {
        titleLength: 36
      });
    });

    it('can compute the length of a string value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(length('title').as('titleLength'))
      );
      expectResults(snapshot, {
        titleLength: 36
      });
    });

    it('can compute the length of an array value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('tags').length().as('tagsLength'))
      );
      expectResults(snapshot, {
        tagsLength: 3
      });
    });

    it('can compute the length of an array value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(length('tags').as('tagsLength'))
      );
      expectResults(snapshot, {
        tagsLength: 3
      });
    });

    it('can compute the length of a map value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('awards').length().as('awardsLength'))
      );
      expectResults(snapshot, {
        awardsLength: 3
      });
    });

    it('can compute the length of a vector value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('embedding').length().as('embeddingLength'))
      );
      expectResults(snapshot, {
        embeddingLength: 10
      });
    });

    it('can compute the length of a bytes value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .select(constant('12é').as('value'))
          .limit(1)
          .select(field('value').byteLength().as('valueLength'))
      );
      expectResults(snapshot, {
        valueLength: 4
      });
    });

    it('can compute the natural logarithm of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').ln().as('lnRating'))
      );
      expect(snapshot.results[0]!.data().lnRating).to.be.closeTo(1.435, 0.001);
    });

    it('can compute the natural logarithm of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(ln('rating').as('lnRating'))
      );
      expect(snapshot.results[0]!.data().lnRating).to.be.closeTo(1.435, 0.001);
    });

    it('can compute the natural logarithm of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(ln('rating').as('lnRating'))
      );
      expectResults(snapshot, {
        lnRating: 1.4350845252893227
      });
    });

    it('can compute the logarithm of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(log(field('rating'), 10).as('logRating'))
      );
      expectResults(snapshot, {
        logRating: 0.6232492903979004
      });
    });

    it('can compute the logarithm of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(log('rating', 10).as('logRating'))
      );
      expectResults(snapshot, {
        logRating: 0.6232492903979004
      });
    });

    it('can round a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').round().as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: 4
      });
    });

    it('can round a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(round('rating').as('roundedRating'))
      );
      expectResults(snapshot, {
        roundedRating: 4
      });
    });

    it('can compute the square root of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('rating').sqrt().as('sqrtRating'))
      );
      expectResults(snapshot, {
        sqrtRating: 2.04939015319192
      });
    });

    it('can compute the square root of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(sqrt('rating').as('sqrtRating'))
      );
      expectResults(snapshot, {
        sqrtRating: 2.04939015319192
      });
    });

    it('can reverse a string', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(field('title').reverse().as('reversedTitle'))
      );
      expectResults(snapshot, {
        reversedTitle: "yxalaG eht ot ediuG s'rekihhctiH ehT"
      });
    });

    it('can reverse a string with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal("The Hitchhiker's Guide to the Galaxy"))
          .limit(1)
          .select(stringReverse('title').as('reversedTitle'))
      );
      expectResults(snapshot, {
        reversedTitle: "yxalaG eht ot ediuG s'rekihhctiH ehT"
      });
    });

    it('supports Document_id', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(
            documentId(field('__name__')).as('docId'),
            documentId(field('__path__')).as('noDocId')
          )
      );
      expectResults(snapshot, {
        docId: 'book4',
        noDocId: null
      });
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('__name__').documentId().as('docId'))
      );
      expectResults(snapshot, {
        docId: 'book4'
      });
    });

    it('supports substring', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(substring('title', 9, 2).as('of'))
      );
      expectResults(snapshot, {
        of: 'of'
      });
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('title').substring(9, 2).as('of'))
      );
      expectResults(snapshot, {
        of: 'of'
      });
    });

    it('supports substring without length', async () => {
      let snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(substring('title', 9).as('of'))
      );
      expectResults(snapshot, {
        of: 'of the Rings'
      });
      snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(field('rating').descending())
          .limit(1)
          .select(field('title').substring(9).as('of'))
      );
      expectResults(snapshot, {
        of: 'of the Rings'
      });
    });

    it('test toLower', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(ascending('title'))
          .select(toLower('author').as('lowercaseAuthor'))
          .limit(1)
      );
      expectResults(snapshot, {
        lowercaseAuthor: 'george orwell'
      });
    });

    it('test toUpper', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .sort(ascending('title'))
          .select(toUpper('author').as('uppercaseAuthor'))
          .limit(1)
      );
      expectResults(snapshot, { uppercaseAuthor: 'GEORGE ORWELL' });
    });

    it('testTrim', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .addFields(
            constant(" The Hitchhiker's Guide to the Galaxy ").as('spacedTitle')
          )
          .select(trim('spacedTitle').as('trimmedTitle'), field('spacedTitle'))
          .limit(1)
      );
      expectResults(snapshot, {
        spacedTitle: " The Hitchhiker's Guide to the Galaxy ",
        trimmedTitle: "The Hitchhiker's Guide to the Galaxy"
      });
    });

    it('test reverse', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(equal('title', '1984'))
          .limit(1)
          .select(reverse('title').as('reverseTitle'))
      );
      expectResults(snapshot, { reverseTitle: '4891' });
    });

    it('testAbs', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .select(
            constant(-10).as('neg10'),
            constant(-22.22).as('neg22'),
            constant(1).as('pos1')
          )
          .select(
            abs('neg10').as('10'),
            abs(field('neg22')).as('22'),
            field('pos1').as('1')
          )
      );
      expectResults(snapshot, {
        '10': 10,
        '22': 22.22,
        '1': 1
      });
    });

    it('can compute the base-10 logarithm of a numeric value', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .select(field('rating').log10().as('log10Rating'))
      );
      expect(snapshot.results[0]!.data().log10Rating).to.be.closeTo(
        0.672,
        0.001
      );
    });

    it('can compute the base-10 logarithm of a numeric value with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .select(log10('rating').as('log10Rating'))
      );
      expect(snapshot.results[0]!.data().log10Rating).to.be.closeTo(
        0.672,
        0.001
      );
    });

    it('can concat fields', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .addFields(
            concat('author', ' ', field('title')).as('display'),
            field('author').concat(': ', field('title')).as('display2')
          )
          .where(equal('author', 'Douglas Adams'))
          .select('display', 'display2')
      );
      expectResults(snapshot, {
        display: "Douglas Adams The Hitchhiker's Guide to the Galaxy",
        display2: "Douglas Adams: The Hitchhiker's Guide to the Galaxy"
      });
    });

    it('supports currentTimestamp', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .addFields(currentTimestamp().as('now'))
          .select('now')
      );
      const now = snapshot.results[0].get('now') as Timestamp;
      expect(now).instanceof(Timestamp);
      expect(
        now.toDate().getUTCSeconds() - new Date().getUTCSeconds()
      ).lessThan(5000);
    });

    it('supports ifAbsent', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              title: 'foo'
            })
          )
          .select(
            ifAbsent('title', 'default title').as('title'),
            field('name').ifAbsent('default name').as('name'),
            field('name').ifAbsent(field('title')).as('nameOrTitle')
          )
      );

      expectResults(snapshot, {
        title: 'foo',
        name: 'default name',
        nameOrTitle: 'foo'
      });
    });

    it('supports join', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .limit(1)
          .replaceWith(
            map({
              tags: ['foo', 'bar', 'baz'],
              delimeter: '|'
            })
          )
          .select(join('tags', ',').as('csv'), field('tags').join('|').as('or'))
      );

      expectResults(snapshot, {
        csv: 'foo,bar,baz',
        or: 'foo|bar|baz'
      });
    });

    it('can compute the sum of the elements in an array', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .addFields(array([150, 200]).as('sales'))
          .select(field('sales').arraySum().as('totalSales'))
      );
      expectResults(snapshot, {
        totalSales: 350
      });
    });

    it('can compute the sum of the elements in an array with the top-level function', async () => {
      const snapshot = await execute(
        firestore
          .pipeline()
          .collection(randomCol.path)
          .where(field('title').equal('The Lord of the Rings'))
          .limit(1)
          .addFields(array([150, 200]).as('sales'))
          .select(arraySum('sales').as('totalSales'))
      );
      expectResults(snapshot, {
        totalSales: 350
      });
    });

    // TODO(new-expression): Add new expression tests above this line
  });

  describe('pagination', () => {
    let addedDocs: DocumentReference[] = [];

    /**
     * Adds several books to the test collection. These
     * additional books support pagination test scenarios
     * that would otherwise not be possible with the original
     * set of books.
     * @param collectionReference
     */
    async function addBooks(
      collectionReference: CollectionReference
    ): Promise<void> {
      let docRef = doc(collectionReference, 'book11');
      addedDocs.push(docRef);
      await setDoc(docRef, {
        title: 'Jonathan Strange & Mr Norrell',
        author: 'Susanna Clarke',
        genre: 'Fantasy',
        published: 2004,
        rating: 4.6,
        tags: ['historical fantasy', 'magic', 'alternate history', 'england'],
        awards: { hugo: false, nebula: false }
      });
      docRef = doc(collectionReference, 'book12');
      addedDocs.push(docRef);
      await setDoc(docRef, {
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
      docRef = doc(collectionReference, 'book13');
      addedDocs.push(docRef);
      await setDoc(docRef, {
        title: 'A Long Way to a Small, Angry Planet',
        author: 'Becky Chambers',
        genre: 'Science Fiction',
        published: 2014,
        rating: 4.6,
        tags: ['space opera', 'found family', 'character-driven', 'optimistic'],
        awards: { hugo: false, nebula: false, kitschies: true }
      });
    }

    afterEach(async () => {
      for (let i = 0; i < addedDocs.length; i++) {
        await deleteDoc(addedDocs[i]);
      }
      addedDocs = [];
    });

    it('supports pagination with filters', async () => {
      await addBooks(randomCol);
      const pageSize = 2;
      const pipeline = firestore
        .pipeline()
        .collection(randomCol.path)
        .select('title', 'rating', '__name__')
        .sort(field('rating').descending(), field('__name__').ascending());

      let snapshot = await execute(pipeline.limit(pageSize));
      expectResults(
        snapshot,
        { title: 'The Lord of the Rings', rating: 4.7 },
        { title: 'Dune', rating: 4.6 }
      );

      const lastDoc = snapshot.results[snapshot.results.length - 1];

      snapshot = await execute(
        pipeline
          .where(
            or(
              and(
                field('rating').equal(lastDoc.get('rating')),
                field('__name__').greaterThan(lastDoc.ref)
              ),
              field('rating').lessThan(lastDoc.get('rating'))
            )
          )
          .limit(pageSize)
      );
      expectResults(
        snapshot,
        { title: 'Jonathan Strange & Mr Norrell', rating: 4.6 },
        { title: 'The Master and Margarita', rating: 4.6 }
      );
    });

    it('supports pagination with offsets', async () => {
      await addBooks(randomCol);

      const secondFilterField = '__name__';

      const pipeline = firestore
        .pipeline()
        .collection(randomCol.path)
        .select('title', 'rating', secondFilterField)
        .sort(
          field('rating').descending(),
          field(secondFilterField).ascending()
        );

      const pageSize = 2;
      let currPage = 0;

      let snapshot = await execute(
        pipeline.offset(currPage++ * pageSize).limit(pageSize)
      );

      expectResults(
        snapshot,
        {
          title: 'The Lord of the Rings',
          rating: 4.7
        },
        { title: 'Dune', rating: 4.6 }
      );

      snapshot = await execute(
        pipeline.offset(currPage++ * pageSize).limit(pageSize)
      );
      expectResults(
        snapshot,
        {
          title: 'Jonathan Strange & Mr Norrell',
          rating: 4.6
        },
        { title: 'The Master and Margarita', rating: 4.6 }
      );

      snapshot = await execute(
        pipeline.offset(currPage++ * pageSize).limit(pageSize)
      );
      expectResults(
        snapshot,
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

  describe('stage options', () => {
    describe('forceIndex', () => {
      // SKIP: requires pre-existing index
      // eslint-disable-next-line no-restricted-properties
      it.skip('Collection Stage', async () => {
        const snapshot = await execute(
          firestore.pipeline().collection({
            collection: randomCol,
            forceIndex: 'unknown'
          })
        );
        expect(snapshot.results.length).to.equal(10);
      });

      // SKIP: requires pre-existing index
      // eslint-disable-next-line no-restricted-properties
      it.skip('CollectionGroup Stage', async () => {
        const snapshot = await execute(
          firestore.pipeline().collectionGroup({
            collectionId: randomCol.id,
            forceIndex: 'unknown'
          })
        );
        expect(snapshot.results.length).to.equal(10);
      });
    });
  });
});
