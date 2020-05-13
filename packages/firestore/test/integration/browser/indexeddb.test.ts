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

import * as firestore from '@firebase/firestore-types';
import { expect } from 'chai';

import { isPersistenceAvailable, withTestDb } from '../util/helpers';

describe('where persistence is unsupported, enablePersistence', () => {
  // Only test on platforms where persistence is *not* available (e.g. Edge,
  // Node.JS).
  if (isPersistenceAvailable()) {
    return;
  }

  it('fails with code unimplemented', () => {
    // withTestDb will fail the test if persistence is requested but it fails
    // so we'll enable persistence here instead.
    return withTestDb(/* persistence= */ false, db => {
      return db.enablePersistence().then(
        () => {
          expect.fail('enablePersistence should not have succeeded!');
        },
        (error: firestore.FirestoreError) => {
          expect(error.code).to.equal('unimplemented');
        }
      );
    });
  });

  it('falls back without requiring a wait for the promise', () => {
    return withTestDb(/* persistence= */ false, db => {
      const persistenceFailedPromise = db
        .enablePersistence()
        .catch((err: firestore.FirestoreError) => {
          expect(err.code).to.equal('unimplemented');
        });

      // Do the set immediately without waiting on the promise.
      const doc = db.collection('test-collection').doc();
      return doc.set({ foo: 'bar' }).then(() => persistenceFailedPromise);
    });
  });
});
