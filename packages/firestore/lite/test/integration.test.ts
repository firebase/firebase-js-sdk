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

import { initializeApp } from '@firebase/app-exp';
import { getFirestore, initializeFirestore } from '../src/api/database';
import { DocumentReference, getDoc } from '../src/api/reference';
import { withTestDoc } from './helpers';
import { key } from '../../test/util/helpers';

describe('Firestore', () => {
  it('can provide setting', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore'
    );
    initializeFirestore(app, { host: 'localhost', ssl: false });
  });

  it('returns same instance', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore'
    );
    const fs1 = getFirestore(app);
    const fs2 = getFirestore(app);
    expect(fs1 === fs2).to.be.true;
  });

  it('cannot call initializeFirestore() after starting firestore', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-getFirestore-initializeFirestore'
    );
    const firestore = getFirestore(app);
    // TODO(firestorelite): Replace with doc()
    getDoc(new DocumentReference(key('coll/doc'), firestore));
    expect(() => initializeFirestore(app, {})).to.throw(
      'Firestore has already been started and its settings can no longer ' +
        'be changed. initializeFirestore() cannot be called after starting ' +
        'Firestore.'
    );
  });
});

describe('getDocument()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).to.be.false;
    });
  });
});
