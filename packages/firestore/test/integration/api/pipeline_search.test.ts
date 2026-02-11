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

import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import {
  GeoPoint,
  Timestamp,
  Bytes,
  getFirestore,
  terminate,
  vector,
  CollectionReference,
  doc,
  DocumentData,
  Firestore,
  setDoc,
  collection,
  documentId as documentIdFieldPath,
  writeBatch,
  addDoc,
  DocumentReference,
  deleteDoc
} from '../util/firebase_export';
import { apiDescribe, withTestCollection } from '../util/helpers';
import {
  array,
  mod,
  pipelineResultEqual,
  sum,
  descending,
  map,
  execute,
  add,
  arrayContainsAll,
  unixSecondsToTimestamp,
  and,
  arrayContains,
  arrayContainsAny,
  count,
  average,
  cosineDistance,
  not,
  countAll,
  dotProduct,
  endsWith,
  equal,
  reverse,
  toUpper,
  euclideanDistance,
  greaterThan,
  like,
  lessThan,
  stringContains,
  divide,
  lessThanOrEqual,
  arrayLength,
  mapGet,
  notEqual,
  or,
  regexContains,
  regexMatch,
  startsWith,
  stringConcat,
  subtract,
  conditional,
  equalAny,
  logicalMaximum,
  notEqualAny,
  multiply,
  countIf,
  exists,
  charLength,
  minimum,
  maximum,
  isError,
  ifError,
  trim,
  isAbsent,
  timestampSubtract,
  mapRemove,
  mapMerge,
  documentId,
  substring,
  logicalMinimum,
  xor,
  field,
  constant,
  FindNearestStageOptions,
  AggregateFunction,
  arrayGet,
  ascending,
  byteLength,
  FunctionExpression,
  timestampAdd,
  timestampToUnixMicros,
  timestampToUnixMillis,
  timestampToUnixSeconds,
  toLower,
  unixMicrosToTimestamp,
  unixMillisToTimestamp,
  vectorLength,
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
  length,
  abs,
  concat,
  currentTimestamp,
  ifAbsent,
  join,
  log10,
  arraySum,
  PipelineSnapshot,
  timestampTruncate,
  split,
  snippet,
  topicalityScore,
  searchFor,
  searchDocumentFor,
  geoDistance
} from '../util/pipeline_export';

use(chaiAsPromised);

const timestampDeltaMS = 1000;

apiDescribe.skipClassic('Pipeline Search', persistence => {
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

  describe('search query', () => {
    it('document contains text', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: searchDocumentFor('waffles')
        });
    });

    it('field contains text', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: field('description').searchFor('waffles')
        });
    });

    firestore
      .pipeline()
      .collection('restaurants')
      .search({
        query: field('menu').searchFor(
          'waffles',
          'SemanticSearch' /* search mode */
        )
      });

    it('geo near query', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: field('location')
            .geoDistance(new GeoPoint(38.989177, -107.065076))
            .lessThan(1000 /* m */)
        });
    });

    it('geo near query with ordering by query/geo-distance', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: field('location')
            .geoDistance(new GeoPoint(38.989177, -107.065076))
            .lessThan(1000 /* m */),
          sort: field('location')
            .geoDistance(new GeoPoint(38.989177, -107.065076))
            .ascending()
        });
    });

    it('sort by geo-distance with unrelated query', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: field('description').searchFor('waffles'),
          sort: field('location')
            .geoDistance(new GeoPoint(38.989177, -107.065076))
            .ascending()
        });
    });

    it('conjunction of query predicates', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: and(
            field('description').searchFor('waffles'),
            field('location')
              .geoDistance(new GeoPoint(38.989177, -107.065076))
              .lessThan(1000)
          )
        });
    });

    it('everything bagel', async () => {
      firestore
        .pipeline()
        .collection('restaurants')
        .search({
          query: field('menu').searchFor('waffles', 'SemanticSearch'),
          addFields: [
            field('menu')
              .snippet({
                rquery: 'waffles',
                maxSnippetWidth: 2000,
                maxSnippets: 2,
                separator: '...',
                searchMode: 'SemanticSearch'
              })
              .as('snippet')
          ]
        });
    });
  });
});
