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

import { stub } from 'sinon';
import { expect } from 'chai';
import {
  getInitializationPromise,
  isPerfInitialized
} from './initialization_service';
import { setupApi } from './api_service';
import { SettingsService } from './settings_service';
import { FirebaseApp } from '@firebase/app-types-exp';
import '../../test/setup';

describe('Firebase Perofmrance > initialization_service', () => {
  const IID = 'fid';
  const AUTH_TOKEN = 'authToken';
  const getId = stub();
  const getToken = stub();

  const mockWindow = { ...self };
  mockWindow.document = { ...mockWindow.document, readyState: 'complete' };

  beforeEach(() => {
    SettingsService.prototype.firebaseAppInstance = ({
      installations: () => ({ getId, getToken })
    } as unknown) as FirebaseApp;

    stub(self, 'fetch').resolves(new Response('{}'));
    mockWindow.localStorage = { ...mockWindow.localStorage, setItem: stub() };

    setupApi(mockWindow);
  });

  it('changes initialization status after initialization is done', async () => {
    getId.resolves(IID);
    getToken.resolves(AUTH_TOKEN);
    await getInitializationPromise();

    expect(isPerfInitialized()).to.be.true;
  });

  it('returns initilization as not done before promise is resolved', async () => {
    getId.resolves(IID);
    getToken.resolves(AUTH_TOKEN);
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    getInitializationPromise();

    expect(isPerfInitialized()).to.be.false;
  });
});
