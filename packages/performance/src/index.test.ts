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
import { initializePerformance } from './index';
import { ERROR_FACTORY, ErrorCode } from './utils/errors';
import '../test/setup';
import { deleteApp, FirebaseApp, initializeApp } from '@firebase/app-exp';

const fakeFirebaseConfig = {
  apiKey: 'api-key',
  authDomain: 'project-id.firebaseapp.com',
  databaseURL: 'https://project-id.firebaseio.com',
  projectId: 'project-id',
  storageBucket: 'project-id.appspot.com',
  messagingSenderId: 'sender-id',
  appId: '1:111:web:a1234'
};

describe('Firebase Performance > initializePerformance()', () => {
  let app: FirebaseApp;
  beforeEach(() => {
    app = initializeApp(fakeFirebaseConfig);
  });
  afterEach(() => {
    return deleteApp(app);
  });
  it('returns same instance if given same (no) params a second time', () => {
    const performanceInstance = initializePerformance(app);
    expect(initializePerformance(app)).to.equal(performanceInstance);
  });
  it('returns same instance if given same params a second time', () => {
    const performanceInstance = initializePerformance(app, {
      dataCollectionEnabled: false
    });
    expect(
      initializePerformance(app, { dataCollectionEnabled: false })
    ).to.equal(performanceInstance);
  });
  it('throws if called with params after being called with no params', () => {
    initializePerformance(app);
    const expectedError = ERROR_FACTORY.create(ErrorCode.ALREADY_INITIALIZED);
    expect(() =>
      initializePerformance(app, { dataCollectionEnabled: false })
    ).to.throw(expectedError.message);
  });
  it('throws if called with no params after being called with params', () => {
    initializePerformance(app, { instrumentationEnabled: false });
    const expectedError = ERROR_FACTORY.create(ErrorCode.ALREADY_INITIALIZED);
    expect(() => initializePerformance(app)).to.throw(expectedError.message);
  });
  it('throws if called a second time with different params', () => {
    initializePerformance(app, { instrumentationEnabled: true });
    const expectedError = ERROR_FACTORY.create(ErrorCode.ALREADY_INITIALIZED);
    expect(() =>
      initializePerformance(app, { instrumentationEnabled: false })
    ).to.throw(expectedError.message);
  });
});
