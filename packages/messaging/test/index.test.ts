/**
 * Copyright 2018 Google Inc.
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
import { sandbox, SinonSandbox, SinonStub } from 'sinon';

import { FirebaseApp } from '@firebase/app-types';
import {
  _FirebaseNamespace,
  FirebaseServiceFactory
} from '@firebase/app-types/private';

import { registerMessaging } from '../index';
import { ERROR_CODES } from '../src/models/errors';

import { SWController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { makeFakeApp } from './testing-utils/make-fake-app';

describe('Firebase Messaging > registerMessaging', () => {
  let sinonSandbox: SinonSandbox;
  let registerService: SinonStub;
  let fakeFirebase: _FirebaseNamespace;

  beforeEach(() => {
    sinonSandbox = sandbox.create();
    registerService = sinonSandbox.stub();

    fakeFirebase = {
      INTERNAL: { registerService }
    } as any;
  });

  afterEach(() => {
    sinonSandbox.restore();
  });

  it('calls registerService', () => {
    registerMessaging(fakeFirebase);
    expect(registerService.callCount).to.equal(1);
  });

  describe('factoryMethod', () => {
    let factoryMethod: FirebaseServiceFactory;
    let fakeApp: FirebaseApp;

    beforeEach(() => {
      registerMessaging(fakeFirebase);
      factoryMethod = registerService.getCall(0).args[1];

      fakeApp = makeFakeApp({
        messagingSenderId: '1234567890'
      });
    });

    describe('in Service Worker context', () => {
      beforeEach(() => {
        // self.ServiceWorkerGlobalScope exists
        // can't stub a non-existing property, so no sinon.stub().
        (self as any).ServiceWorkerGlobalScope = {};
      });

      afterEach(() => {
        delete (self as any).ServiceWorkerGlobalScope;
      });

      it('returns a SWController', () => {
        const firebaseService = factoryMethod(fakeApp);
        expect(firebaseService).to.be.instanceOf(SWController);
      });
    });

    describe('in Window context', () => {
      it('throws if required globals do not exist', () => {
        // Empty navigator, no navigator.serviceWorker ¯\_(ツ)_/¯
        sinonSandbox.stub(window, 'navigator').value({});

        try {
          factoryMethod(fakeApp);
        } catch (e) {
          expect(e.code).to.equal(
            'messaging/' + ERROR_CODES.UNSUPPORTED_BROWSER
          );
          return;
        }
        throw new Error('Expected getToken to throw ');
      });

      it('returns a WindowController', () => {
        const firebaseService = factoryMethod(fakeApp);
        expect(firebaseService).to.be.instanceOf(WindowController);
      });
    });
  });
});
