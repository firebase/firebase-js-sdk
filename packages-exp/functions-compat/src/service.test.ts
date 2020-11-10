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
import { expect, use } from 'chai';
import { createTestService } from '../test/utils';
import { FunctionsService } from './service';
import { firebase } from '@firebase/app-compat';
import { FirebaseApp } from '@firebase/app-types';
import * as functionsExp from '@firebase/functions-exp';
import { stub, match, SinonStub } from 'sinon';
import * as sinonChai from 'sinon-chai';

use(sinonChai);

describe('Firebase Functions > Service', () => {
  let app: FirebaseApp;
  let service: FunctionsService;
  let functionsEmulatorStub: SinonStub = stub();
  let httpsCallableStub: SinonStub = stub();

  before(() => {
    functionsEmulatorStub = stub(functionsExp, 'useFunctionsEmulator');
    httpsCallableStub = stub(functionsExp, 'httpsCallable');
  });

  beforeEach(() => {
    app = firebase.initializeApp({
      projectId: 'my-project',
      messagingSenderId: 'messaging-sender-id'
    });
  });

  afterEach(async () => {
    await app.delete();
  });

  after(() => {
    functionsEmulatorStub.restore();
    httpsCallableStub.restore();
  });

  it('useFunctionsEmulator (deprecated) calls modular useEmulator', () => {
    service = createTestService(app);
    service.useFunctionsEmulator('http://localhost:5005');
    expect(functionsEmulatorStub).to.be.calledWith(
      match.any,
      'localhost',
      5005
    );
    functionsEmulatorStub.resetHistory();
  });

  it('useEmulator calls modular useEmulator', () => {
    service = createTestService(app);
    service.useEmulator('otherlocalhost', 5006);
    expect(functionsEmulatorStub).to.be.calledWith(
      match.any,
      'otherlocalhost',
      5006
    );
    functionsEmulatorStub.resetHistory();
  });

  it('httpsCallable calls modular httpsCallable', () => {
    service = createTestService(app);
    service.httpsCallable('blah', { timeout: 2000 });
    expect(httpsCallableStub).to.be.calledWith(match.any, 'blah', {
      timeout: 2000
    });
    httpsCallableStub.resetHistory();
  });

  it('correctly sets region', () => {
    service = createTestService(app, 'my-region');
    expect(service._region).to.equal('my-region');
  });

  it('correctly sets custom domain', () => {
    service = createTestService(app, 'https://mydomain.com');
    expect(service._customDomain).to.equal('https://mydomain.com');
  });
});
