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

import { FirebaseApp } from '@firebase/app-types';
import { expect } from 'chai';
import { sandbox, SinonSandbox } from 'sinon';

import { FirebaseMessaging, isSupported } from '../index';
import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import { ERROR_CODES } from '../src/models/errors';

import { makeFakeApp } from './testing-utils/make-fake-app';
import { describe } from './testing-utils/messaging-test-runner';

describe('Firebase Messaging', () => {
  let sinonSandbox: SinonSandbox;
  let fakeApp: FirebaseApp;

  beforeEach(() => {
    sinonSandbox = sandbox.create();
    fakeApp = makeFakeApp({ messagingSenderId: '1234567890' });
  });

  afterEach(() => {
    sinonSandbox.restore();
  });

  describe('isSupported', () => {
    it('is a function', () => {
      expect(isSupported).to.be.a('function');
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

    it('creates a SwController', () => {
      const firebaseService = new FirebaseMessaging(fakeApp);
      expect(firebaseService['controller']).to.be.instanceOf(SwController);
    });
  });

  describe('in Window context', () => {
    it('throws if required globals do not exist', () => {
      // Empty navigator, no navigator.serviceWorker ¯\_(ツ)_/¯
      sinonSandbox.stub(window, 'navigator').value({});

      try {
        new FirebaseMessaging(fakeApp);
      } catch (e) {
        expect(e.code).to.equal('messaging/' + ERROR_CODES.UNSUPPORTED_BROWSER);
        return;
      }
      throw new Error('Expected getToken to throw ');
    });

    it('creates a WindowController', () => {
      const firebaseService = new FirebaseMessaging(fakeApp);
      expect(firebaseService['controller']).to.be.instanceOf(WindowController);
    });
  });
});
