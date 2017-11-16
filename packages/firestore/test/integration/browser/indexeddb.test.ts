/**
 * Copyright 2017 Google Inc.
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
import * as firestore from 'firestore';

import { isPersistenceAvailable, withTestDb } from '../util/helpers';

describe('where persistence is unsupported, enablePersistence', () => {
  // Only test on browsers where persistence is *not* available (e.g. Edge).
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
      // Disregard the promise here intentionally.
      db.enablePersistence();

      const doc = db.collection('test-collection').doc();
      return doc.set({ foo: 'bar' });
    });
  });
});
