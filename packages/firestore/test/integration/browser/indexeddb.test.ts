/**
 * @license
 * Copyright 2017 Google LLC
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
  enableIndexedDbPersistence,
  collection,
  doc,
  FirestoreError,
  setDoc
} from '../util/firebase_export';
import {
  IndexedDbPersistenceMode,
  MemoryEagerPersistenceMode,
  isPersistenceAvailable,
  withTestDb
} from '../util/helpers';

describe('where indexeddb is not available: ', () => {
  // Only test on platforms where persistence is *not* available (e.g. Edge,
  // Node.JS).
  if (isPersistenceAvailable()) {
    return;
  }

  it('fails with code unimplemented', () => {
    // withTestDb will fail the test if persistence is requested but it fails
    // so we'll enable persistence here instead.
    return withTestDb(new MemoryEagerPersistenceMode(), db => {
      return enableIndexedDbPersistence(db).then(
        () => expect.fail('enablePersistence should not have succeeded!'),
        (error: FirestoreError) => {
          expect(error.code).to.equal('unimplemented');
        }
      );
    });
  });

  it('falls back without requiring a wait for the promise', () => {
    return withTestDb(new MemoryEagerPersistenceMode(), db => {
      const persistenceFailedPromise = enableIndexedDbPersistence(db).catch(
        (err: FirestoreError) => {
          expect(err.code).to.equal('unimplemented');
        }
      );

      // Do the set immediately without waiting on the promise.
      const testDoc = doc(collection(db, 'test-collection'));
      return setDoc(testDoc, { foo: 'bar' }).then(
        () => persistenceFailedPromise
      );
    });
  });

  it('fails back to memory cache with initializeFirestore too', () => {
    // withTestDb will fail the test if persistence is requested but it fails
    // so we'll enable persistence here instead.
    return withTestDb(new IndexedDbPersistenceMode(), db => {
      // Do the set immediately without waiting on the promise.
      const testDoc = doc(collection(db, 'test-collection'));
      return setDoc(testDoc, { foo: 'bar' });
    });
  });
});
