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

import { createTestService } from '../test/utils';
import { FunctionsService } from './service';
import firebase, { FirebaseApp } from '@firebase/app-compat';
import * as functionsExp from '@firebase/functions';

vi.mock('@firebase/functions', { spy: true });

describe('Firebase Functions > Service', () => {
  let app: FirebaseApp;
  let service: FunctionsService;
  let functionsEmulatorStub = vi.fn();
  let httpsCallableStub = vi.fn();

  beforeEach(() => {
    functionsEmulatorStub = vi.spyOn(functionsExp, 'connectFunctionsEmulator');
    httpsCallableStub = vi.spyOn(functionsExp, 'httpsCallable');
    app = firebase.initializeApp({
      projectId: 'my-project',
      messagingSenderId: 'messaging-sender-id'
    });
  });

  afterEach(async () => {
    await app.delete();
  });

  it('useFunctionsEmulator (deprecated) calls modular useEmulator', () => {
    service = createTestService(app);
    service.useFunctionsEmulator('http://localhost:5005');
    expect(functionsEmulatorStub).toHaveBeenCalledWith(
      expect.anything(),
      'localhost',
      5005
    );
    functionsEmulatorStub.mockClear();
  });

  it('useEmulator calls modular useEmulator', () => {
    service = createTestService(app);
    service.useEmulator('otherlocalhost', 5006);
    expect(functionsEmulatorStub).toHaveBeenCalledWith(
      expect.anything(),
      'otherlocalhost',
      5006
    );
    functionsEmulatorStub.mockClear();
  });

  it('httpsCallable calls modular httpsCallable', () => {
    service = createTestService(app);
    service.httpsCallable('blah', { timeout: 2000 });
    expect(httpsCallableStub).toHaveBeenCalledWith(expect.anything(), 'blah', {
      timeout: 2000
    });
    httpsCallableStub.mockClear();
  });

  it('correctly sets region', () => {
    service = createTestService(app, 'my-region');
    expect(service._region).toBe('my-region');
  });

  it('correctly sets custom domain', () => {
    service = createTestService(app, 'https://mydomain.com');
    expect(service._customDomain).toBe('https://mydomain.com');
  });
});
