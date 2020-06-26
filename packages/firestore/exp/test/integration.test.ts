/**
 * @license
 * Copyright 2020 Google LLC
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

import { initializeApp } from '@firebase/app-exp';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import {
  Firestore,
  getFirestore,
  initializeFirestore
} from '../src/api/database';
import { withTestDoc } from './helpers';
import {
  getDoc,
  getDocFromCache,
  getDocFromServer
} from '../src/api/reference';

use(chaiAsPromised);

describe('Firestore', () => {
  it('can provide setting', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore'
    );
    const fs1 = initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(fs1).to.be.an.instanceOf(Firestore);
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
});

describe('getDoc()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDoc(docRef);
      expect(docSnap.metadata.fromCache).to.be.false;
      expect(docSnap.metadata.hasPendingWrites).to.be.false;
      expect(docSnap.data()).to.be.undefined;
      expect(docSnap.exists()).to.be.false;
    });
  });
});

describe('getDocFromCache()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      await expect(getDocFromCache(docRef)).to.eventually.be.rejectedWith(
        /Failed to get document from cache./
      );
    });
  });
});

describe('getDocFromServer()', () => {
  it('can get a non-existing document', () => {
    return withTestDoc(async docRef => {
      const docSnap = await getDocFromServer(docRef);
      expect(docSnap.metadata.fromCache).to.be.false;
      expect(docSnap.metadata.hasPendingWrites).to.be.false;
      expect(docSnap.data()).to.be.undefined;
      expect(docSnap.exists()).to.be.false;
    });
  });
});
