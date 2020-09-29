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
import { assert } from 'chai';
import { createTestService } from '../test/utils';
import { FunctionsService } from './service';
import { firebase } from '@firebase/app-compat';
import { FirebaseApp } from '@firebase/app-types';

describe('Firebase Functions > Service', () => {
  let app: FirebaseApp;
  let service: FunctionsService;

  beforeEach(() => {
    app = firebase.initializeApp({
      projectId: 'my-project',
      messagingSenderId: 'messaging-sender-id'
    });
  });

  afterEach(async () => {
    await app.delete();
  });

  it('can use emulator', () => {
    service = createTestService(app);
    service.useFunctionsEmulator('http://localhost:5005');
    // Can't evaluate internals, just check it doesn't throw.
    // functions-exp tests will evaluate details.
  });

  it('correctly sets region', () => {
    service = createTestService(app, 'my-region');
    assert.equal(service._region, 'my-region');
  });

  it('correctly sets custom domain', () => {
    service = createTestService(app, 'https://mydomain.com');
    assert.equal(service._customDomain, 'https://mydomain.com');
  });
});
