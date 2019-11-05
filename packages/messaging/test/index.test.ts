/**
 * @license
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
import { stub, restore, SinonStub } from 'sinon';

import { FirebaseApp } from '@firebase/app-types';
import {
  _FirebaseNamespace,
  FirebaseService
} from '@firebase/app-types/private';

import { registerMessaging } from '../index';
import { ErrorCode } from '../src/models/errors';

import { SwController } from '../src/controllers/sw-controller';
import { WindowController } from '../src/controllers/window-controller';
import {
  makeFakeApp,
  makeFakeInstallations
} from './testing-utils/make-fake-firebase-services';
import {
  InstanceFactory,
  ComponentContainer,
  Component,
  ComponentType
} from '@firebase/component';

describe('Firebase Messaging > registerMessaging', () => {
  let registerComponent: SinonStub;
  let fakeFirebase: _FirebaseNamespace;

  beforeEach(() => {
    registerComponent = stub();

    fakeFirebase = {
      INTERNAL: { registerComponent }
    } as any;
  });

  afterEach(() => {
    restore();
  });

  it('calls registerComponent', () => {
    registerMessaging(fakeFirebase);
    expect(registerComponent.callCount).to.equal(1);
  });

  describe('factoryMethod', () => {
    let factoryMethod: InstanceFactory<FirebaseService>;
    let fakeApp: FirebaseApp;
    let fakeContainer: ComponentContainer;

    beforeEach(() => {
      registerMessaging(fakeFirebase);
      factoryMethod = registerComponent.getCall(0).args[0].instanceFactory;

      fakeApp = makeFakeApp({
        messagingSenderId: '1234567890'
      });
      fakeContainer = new ComponentContainer('test');
      fakeContainer.addComponent(
        new Component('app', () => fakeApp, ComponentType.PUBLIC)
      );
      fakeContainer.addComponent(
        new Component(
          'installations',
          () => makeFakeInstallations(),
          ComponentType.PUBLIC
        )
      );
    });

    describe('isSupported', () => {
      it('is a namespace export', () => {
        const component = registerComponent.getCall(0).args[0];
        expect(component.serviceProps.isSupported).to.be.a('function');
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

      it('returns a SwController', () => {
        const firebaseService = factoryMethod(fakeContainer);
        expect(firebaseService).to.be.instanceOf(SwController);
      });
    });

    describe('in Window context', () => {
      it('throws if required globals do not exist', () => {
        // Empty navigator, no navigator.serviceWorker ¯\_(ツ)_/¯
        stub(window, 'navigator').value({});

        try {
          factoryMethod(fakeContainer);
        } catch (e) {
          expect(e.code).to.equal('messaging/' + ErrorCode.UNSUPPORTED_BROWSER);
          return;
        }
        throw new Error('Expected getToken to throw ');
      });

      it('returns a WindowController', () => {
        const firebaseService = factoryMethod(fakeContainer);
        expect(firebaseService).to.be.instanceOf(WindowController);
      });
    });
  });
});
