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

import { _onRealtimePipelineSnapshot } from '../../../src/api/pipeline_impl';
import { RealtimePipelineSnapshot } from '../../../src/api/snapshot';
import { eq, field } from '../../../src/lite-api/expressions';
import { PipelineResult } from '../../../src/lite-api/pipeline-result';
import { addEqualityMatcher } from '../../util/equality_matcher';
import { Deferred } from '../../util/promise';
import { EventsAccumulator } from '../util/events_accumulator';
import {
  CollectionReference,
  doc,
  DocumentData,
  Firestore,
  setDoc,
  setLogLevel,
  updateDoc
} from '../util/firebase_export';
import { apiDescribe, toDataArray, withTestCollection } from '../util/helpers';

use(chaiAsPromised);

apiDescribe('Pipelines', persistence => {
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

  function expectResults(result: PipelineResult[], ...docs: string[]): void;
  function expectResults(
    result: PipelineResult[],
    ...data: DocumentData[]
  ): void;

  function expectResults(
    result: PipelineResult[],
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

  // TODO(pipeline): move this to a util file
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
    setLogLevel('debug');
  });

  afterEach(async () => {
    testDeferred?.resolve();
    await withTestCollectionPromise;
    setLogLevel('info');
  });

  it('basic listen with where() works', async () => {
    const storeEvent = new EventsAccumulator<RealtimePipelineSnapshot>();

    const unsubscribe = _onRealtimePipelineSnapshot(
      firestore
        .realtimePipeline()
        .collection(randomCol.path)
        .where(eq('author', 'Douglas Adams')),
      storeEvent.storeEvent
    );
    let snapshot = await storeEvent.awaitEvent();

    expect(toDataArray(snapshot)).to.deep.equal([
      {
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
      }
    ]);

    await updateDoc(doc(randomCol, 'book1'), { rating: 4.3 });
    snapshot = await storeEvent.awaitEvent();
    expect(toDataArray(snapshot)).to.deep.equal([
      {
        title: "The Hitchhiker's Guide to the Galaxy",
        author: 'Douglas Adams',
        genre: 'Science Fiction',
        published: 1979,
        rating: 4.3,
        tags: ['comedy', 'space', 'adventure'],
        awards: {
          hugo: true,
          nebula: false,
          others: { unknown: { year: 1980 } }
        },
        nestedField: { 'level.1': { 'level.2': true } }
      }
    ]);

    await updateDoc(doc(randomCol, 'book2'), { author: 'Douglas Adams' });
    snapshot = await storeEvent.awaitEvent();
    expect(toDataArray(snapshot)).to.deep.equal([
      {
        title: "The Hitchhiker's Guide to the Galaxy",
        author: 'Douglas Adams',
        genre: 'Science Fiction',
        published: 1979,
        rating: 4.3,
        tags: ['comedy', 'space', 'adventure'],
        awards: {
          hugo: true,
          nebula: false,
          others: { unknown: { year: 1980 } }
        },
        nestedField: { 'level.1': { 'level.2': true } }
      },
      {
        title: 'Pride and Prejudice',
        author: 'Douglas Adams', //'Jane Austen',
        genre: 'Romance',
        published: 1813,
        rating: 4.5,
        tags: ['classic', 'social commentary', 'love'],
        awards: { none: true }
      }
    ]);
  });

  it('listen with where/sort/limit works', async () => {
    const storeEvent = new EventsAccumulator<RealtimePipelineSnapshot>();

    const unsubscribe = _onRealtimePipelineSnapshot(
      firestore
        .realtimePipeline()
        .collection(randomCol.path)
        // "Frank Herbert" "Douglas Adams" "George Orwell"
        .where(field('author').charLength().eq(13))
        .sort(field('rating').descending())
        .limit(1),
      storeEvent.storeEvent
    );
    let snapshot = await storeEvent.awaitEvent();

    expect(toDataArray(snapshot)).to.deep.equal([
      {
        title: 'Dune',
        author: 'Frank Herbert',
        genre: 'Science Fiction',
        published: 1965,
        rating: 4.6,
        tags: ['politics', 'desert', 'ecology'],
        awards: { hugo: true, nebula: true }
      }
    ]);

    await updateDoc(doc(randomCol, 'book10'), { author: 'F.Herbert' });
    snapshot = await storeEvent.awaitEvent();
    expect(toDataArray(snapshot)).to.deep.equal([
      {
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
      }
    ]);

    await updateDoc(doc(randomCol, 'book2'), { author: 'Douglas Adams' });
    snapshot = await storeEvent.awaitEvent();
    expect(toDataArray(snapshot)).to.deep.equal([
      {
        title: 'Pride and Prejudice',
        author: 'Douglas Adams', //'Jane Austen',
        genre: 'Romance',
        published: 1813,
        rating: 4.5,
        tags: ['classic', 'social commentary', 'love'],
        awards: { none: true }
      }
    ]);
  });
});
