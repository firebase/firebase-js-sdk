/**
 * @license
 * Copyright 2026 Google LLC
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

import {
  getInitializationPromise,
  isPerfInitialized
} from './initialization_service';
import { setupApi } from './api_service';
import { FirebaseApp } from '@firebase/app';
import '../../test/setup';
import { FirebaseInstallations } from '@firebase/installations-types';
import { PerformanceController } from '../controllers/perf';
import { vi } from 'vitest';

describe('Firebase Performance > initialization_service', () => {
  const IID = 'fid';
  const AUTH_TOKEN = 'authToken';
  const getId = vi.fn();
  const getToken = vi.fn();

  const fakeFirebaseConfig = {
    apiKey: 'api-key',
    authDomain: 'project-id.firebaseapp.com',
    databaseURL: 'https://project-id.firebaseio.com',
    projectId: 'project-id',
    storageBucket: 'project-id.appspot.com',
    messagingSenderId: 'sender-id',
    appId: '1:111:web:a1234'
  };

  const fakeFirebaseApp = {
    options: fakeFirebaseConfig
  } as unknown as FirebaseApp;

  const fakeInstallations = {
    getId,
    getToken
  } as unknown as FirebaseInstallations;
  const performanceController = new PerformanceController(
    fakeFirebaseApp,
    fakeInstallations
  );

  const mockWindow = { ...self };
  mockWindow.document = { ...mockWindow.document, readyState: 'complete' };

  beforeEach(() => {
    vi.spyOn(self, 'fetch').mockResolvedValue(new Response('{}'));
    mockWindow.localStorage = { ...mockWindow.localStorage, setItem: vi.fn() };

    setupApi(mockWindow);
  });

  it('changes initialization status after initialization is done', async () => {
    getId.mockResolvedValue(IID);
    getToken.mockResolvedValue(AUTH_TOKEN);
    await getInitializationPromise(performanceController);

    expect(isPerfInitialized()).toBe(true);
  });

  it('returns initialization as not done before promise is resolved', async () => {
    getId.mockResolvedValue(IID);
    getToken.mockResolvedValue(AUTH_TOKEN);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getInitializationPromise(performanceController);

    expect(isPerfInitialized()).toBe(false);
  });
});
