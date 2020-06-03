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

import { expect } from 'chai';

import { initializeApp } from '@firebase/app-exp';
import {
  Firestore,
  getFirestore,
  initializeFirestore
} from '../src/api/database';
import { expectEqual, expectNotEqual } from '../../test/util/helpers';
import { FieldValue } from '../../src/api/field_value';

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

  it('cannot call initializeFirestore() twice', () => {
    const app = initializeApp(
      { apiKey: 'fake-api-key', projectId: 'test-project' },
      'test-app-initializeFirestore-twice'
    );
    initializeFirestore(app, { host: 'localhost', ssl: false });
    expect(() => {
      initializeFirestore(app, { host: 'localhost', ssl: false });
    }).to.throw(
      'Firestore has already been started and its settings can no longer be changed.'
    );
  });
});

describe('FieldValue', () => {
  it('support equality checking with isEqual()', () => {
    expectEqual(FieldValue.delete(), FieldValue.delete());
    expectEqual(FieldValue.serverTimestamp(), FieldValue.serverTimestamp());
    expectNotEqual(FieldValue.delete(), FieldValue.serverTimestamp());
    // TODO(firestorelite): Add test when field value is available
    //expectNotEqual(FieldValue.delete(), documentId());
  });

  it('support instanceof checks', () => {
    expect(FieldValue.delete()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.serverTimestamp()).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.increment(1)).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayUnion('a')).to.be.an.instanceOf(FieldValue);
    expect(FieldValue.arrayRemove('a')).to.be.an.instanceOf(FieldValue);
  });
});
