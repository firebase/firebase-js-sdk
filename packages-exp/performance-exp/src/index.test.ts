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
import { stub } from 'sinon';
import { initializePerformance } from './index';
import { ERROR_FACTORY, ErrorCode } from './utils/errors';
import * as firebase from '@firebase/app-exp';
import { Provider } from '@firebase/component';
import '../test/setup';

const fakeFirebaseConfig = {
  apiKey: 'api-key',
  authDomain: 'project-id.firebaseapp.com',
  databaseURL: 'https://project-id.firebaseio.com',
  projectId: 'project-id',
  storageBucket: 'project-id.appspot.com',
  messagingSenderId: 'sender-id',
  appId: '1:111:web:a1234'
};

const fakeFirebaseApp = ({
  options: fakeFirebaseConfig
} as unknown) as firebase.FirebaseApp;

describe('Firebase Performance > initializePerformance()', () => {
  it('throws if a perf instance has already been created', () => {
    stub(firebase, '_getProvider').returns(({
      isInitialized: () => true
    } as unknown) as Provider<'performance-exp'>);
    const expectedError = ERROR_FACTORY.create(ErrorCode.ALREADY_INITIALIZED);
    expect(() => initializePerformance(fakeFirebaseApp)).to.throw(
      expectedError.message
    );
  });
});
