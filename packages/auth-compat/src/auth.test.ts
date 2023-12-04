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

import { FirebaseApp } from '@firebase/app-compat';
import * as exp from '@firebase/auth/internal';
import { Provider } from '@firebase/component';
import { expect, use } from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { Auth } from './auth';
import { CompatPopupRedirectResolver } from './popup_redirect';
import * as platform from './platform';
import {
  FAKE_APP_CHECK_CONTROLLER_PROVIDER,
  FAKE_HEARTBEAT_CONTROLLER_PROVIDER
} from '../test/helpers/helpers';

use(sinonChai);

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// For the most part, the auth methods just call straight through. Some parts
// of the auth compat layer are more complicated: these tests cover those
describe('auth compat', () => {
  context('redirect persistence key storage', () => {
    let underlyingAuth: exp.AuthImpl;
    let app: FirebaseApp;
    let providerStub: sinon.SinonStubbedInstance<Provider<'auth'>>;

    beforeEach(() => {
      app = { options: { apiKey: 'api-key' } } as FirebaseApp;
      underlyingAuth = new exp.AuthImpl(
        app,
        FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
        FAKE_APP_CHECK_CONTROLLER_PROVIDER,
        {
          apiKey: 'api-key'
        } as exp.ConfigInternal
      );
      sinon.stub(underlyingAuth, '_initializeWithPersistence');

      providerStub = sinon.createStubInstance(Provider);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('saves the persistence into session storage if available', async () => {
      if (typeof self !== 'undefined') {
        underlyingAuth._initializationPromise = Promise.resolve();
        sinon.stub(underlyingAuth, '_getPersistence').returns('TEST');
        sinon
          .stub(underlyingAuth, '_initializationPromise')
          .value(Promise.resolve());
        sinon.stub(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            CompatPopupRedirectResolver
          ),
          '_openRedirect'
        );
        providerStub.isInitialized.returns(true);
        providerStub.getImmediate.returns(underlyingAuth);
        const authCompat = new Auth(
          app,
          providerStub as unknown as Provider<'auth'>
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await authCompat.signInWithRedirect(new exp.GoogleAuthProvider());
        expect(
          sessionStorage.getItem('firebase:persistence:api-key:undefined')
        ).to.eq('TEST');
      }
    });

    it('does not save persistence if property throws DOMException', async () => {
      if (typeof self !== 'undefined') {
        sinon.stub(platform, '_getSelfWindow').returns({
          get sessionStorage(): Storage {
            throw new DOMException('Nope!');
          }
        } as unknown as Window);
        const setItemSpy = sinon.spy(sessionStorage, 'setItem');
        sinon.stub(underlyingAuth, '_getPersistence').returns('TEST');
        sinon
          .stub(underlyingAuth, '_initializationPromise')
          .value(Promise.resolve());
        sinon.stub(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            CompatPopupRedirectResolver
          ),
          '_openRedirect'
        );
        providerStub.isInitialized.returns(true);
        providerStub.getImmediate.returns(underlyingAuth);
        const authCompat = new Auth(
          app,
          providerStub as unknown as Provider<'auth'>
        );
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await authCompat.signInWithRedirect(new exp.GoogleAuthProvider());
        await delay(50);
        expect(setItemSpy).not.to.have.been.calledWith(
          'firebase:persistence:api-key:undefined',
          'TEST'
        );
      }
    });

    it('pulls the persistence and sets as the main persitsence if set', () => {
      if (typeof self !== 'undefined') {
        sessionStorage.setItem(
          'firebase:persistence:api-key:undefined',
          'none'
        );
        providerStub.isInitialized.returns(false);
        providerStub.initialize.returns(underlyingAuth);
        new Auth(app, providerStub as unknown as Provider<'auth'>);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        expect(providerStub.initialize).to.have.been.calledWith({
          options: {
            popupRedirectResolver: CompatPopupRedirectResolver,
            persistence: [
              exp.inMemoryPersistence,
              exp.indexedDBLocalPersistence,
              exp.browserLocalPersistence,
              exp.browserSessionPersistence
            ]
          }
        });
      }
    });

    it('does not die if sessionStorage errors', async () => {
      if (typeof self !== 'undefined') {
        sinon.stub(platform, '_getSelfWindow').returns({
          get sessionStorage(): Storage {
            throw new DOMException('Nope!');
          }
        } as unknown as Window);
        sessionStorage.setItem(
          'firebase:persistence:api-key:undefined',
          'none'
        );
        providerStub.isInitialized.returns(false);
        providerStub.initialize.returns(underlyingAuth);
        new Auth(app, providerStub as unknown as Provider<'auth'>);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        await delay(50);
        expect(providerStub.initialize).to.have.been.calledWith({
          options: {
            popupRedirectResolver: CompatPopupRedirectResolver,
            persistence: [
              exp.indexedDBLocalPersistence,
              exp.browserLocalPersistence,
              exp.browserSessionPersistence,
              exp.inMemoryPersistence
            ]
          }
        });
      }
    });
  });
});
