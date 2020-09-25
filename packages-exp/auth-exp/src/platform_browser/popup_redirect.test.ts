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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { SDK_VERSION } from '@firebase/app-exp';
import { Config, ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import {
  TEST_AUTH_DOMAIN,
  TEST_KEY,
  testAuth,
  TestAuth
} from '../../test/helpers/mock_auth';
import { AuthEventManager } from '../core/auth/auth_event_manager';
import { OAuthProvider } from '../core/providers/oauth';
import { SingletonInstantiator } from '../core/util/instantiator';
import * as validateOrigin from '../core/util/validate_origin';
import {
  AuthEvent,
  AuthEventType,
  GapiAuthEvent,
  PopupRedirectResolver
} from '../model/popup_redirect';
import * as authWindow from './auth_window';
import * as gapiLoader from './iframe/gapi';
import { browserPopupRedirectResolver } from './popup_redirect';

use(chaiAsPromised);
use(sinonChai);

describe('src/platform_browser/popup_redirect', () => {
  let resolver: PopupRedirectResolver;
  let auth: TestAuth;
  let onIframeMessage: (event: GapiAuthEvent) => Promise<void>;
  let iframeSendStub: sinon.SinonStub;

  beforeEach(async () => {
    auth = await testAuth();
    resolver = new (browserPopupRedirectResolver as SingletonInstantiator<
      PopupRedirectResolver
    >)();

    sinon.stub(validateOrigin, '_validateOrigin').returns(Promise.resolve());
    iframeSendStub = sinon.stub();

    sinon.stub(gapiLoader, '_loadGapi').returns(
      Promise.resolve(({
        open: () =>
          Promise.resolve({
            register: (
              _message: string,
              cb: (event: GapiAuthEvent) => Promise<void>
            ) => (onIframeMessage = cb),
            send: iframeSendStub
          })
      } as unknown) as gapi.iframes.Context)
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  context('#_openPopup', () => {
    let popupUrl: string | undefined;
    let provider: OAuthProvider;
    const event = AuthEventType.LINK_VIA_POPUP;

    beforeEach(async () => {
      sinon.stub(window, 'open').callsFake(url => {
        popupUrl = url;
        return {} as Window;
      });
      provider = new OAuthProvider(ProviderId.GOOGLE);
    });

    it('builds the correct url', async () => {
      await resolver._initialize(auth);
      provider.addScope('some-scope-a');
      provider.addScope('some-scope-b');
      provider.setCustomParameters({ foo: 'bar' });

      await resolver._openPopup(auth, provider, event);
      expect(popupUrl).to.include(
        `https://${TEST_AUTH_DOMAIN}/__/auth/handler`
      );
      expect(popupUrl).to.include(`apiKey=${TEST_KEY}`);
      expect(popupUrl).to.include('appName=test-app');
      expect(popupUrl).to.include(`authType=${AuthEventType.LINK_VIA_POPUP}`);
      expect(popupUrl).to.include(`v=${SDK_VERSION}`);
      expect(popupUrl).to.include('scopes=some-scope-a%2Csome-scope-b');
      expect(popupUrl).to.include(
        'customParameters=%7B%22foo%22%3A%22bar%22%7D'
      );
    });

    it('throws an error if authDomain is unspecified', async () => {
      delete auth.config.authDomain;
      await resolver._initialize(auth);

      await expect(
        resolver._openPopup(auth, provider, event)
      ).to.be.rejectedWith(FirebaseError, 'auth/auth-domain-config-required');
    });

    it('throws an error if apiKey is unspecified', async () => {
      delete (auth.config as Partial<Config>).apiKey;
      await resolver._initialize(auth);

      await expect(
        resolver._openPopup(auth, provider, event)
      ).to.be.rejectedWith(FirebaseError, 'auth/invalid-api-key');
    });

    it('rejects immediately if origin validation fails', async () => {
      await resolver._initialize(auth);
      (validateOrigin._validateOrigin as sinon.SinonStub).returns(
        Promise.reject(new Error('invalid-origin'))
      );

      await expect(
        resolver._openPopup(auth, provider, event)
      ).to.be.rejectedWith(Error, 'invalid-origin');
    });
  });

  context('#_openRedirect', () => {
    let newWindowLocation: string;
    let provider: OAuthProvider;
    const event = AuthEventType.LINK_VIA_POPUP;

    beforeEach(async () => {
      provider = new OAuthProvider(ProviderId.GOOGLE);
      await resolver._initialize(auth);
      sinon.stub(authWindow, '_setWindowLocation').callsFake(url => {
        newWindowLocation = url;
      });
    });

    it('builds the correct url', async () => {
      provider.addScope('some-scope-a');
      provider.addScope('some-scope-b');
      provider.setCustomParameters({ foo: 'bar' });

      // This promise will never resolve on purpose
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      resolver._openRedirect(auth, provider, event);

      // Delay one tick
      await Promise.resolve();

      expect(newWindowLocation).to.include(
        `https://${TEST_AUTH_DOMAIN}/__/auth/handler`
      );
      expect(newWindowLocation).to.include(`apiKey=${TEST_KEY}`);
      expect(newWindowLocation).to.include('appName=test-app');
      expect(newWindowLocation).to.include(
        `authType=${AuthEventType.LINK_VIA_POPUP}`
      );
      expect(newWindowLocation).to.include(`v=${SDK_VERSION}`);
      expect(newWindowLocation).to.include(
        'scopes=some-scope-a%2Csome-scope-b'
      );
      expect(newWindowLocation).to.include(
        'customParameters=%7B%22foo%22%3A%22bar%22%7D'
      );
    });

    it('throws an error if authDomain is unspecified', async () => {
      delete auth.config.authDomain;

      await expect(
        resolver._openRedirect(auth, provider, event)
      ).to.be.rejectedWith(FirebaseError, 'auth/auth-domain-config-required');
    });

    it('throws an error if apiKey is unspecified', async () => {
      delete (auth.config as Partial<Config>).apiKey;

      await expect(
        resolver._openRedirect(auth, provider, event)
      ).to.be.rejectedWith(FirebaseError, 'auth/invalid-api-key');
    });

    it('rejects immediately if origin validation fails', async () => {
      (validateOrigin._validateOrigin as sinon.SinonStub).returns(
        Promise.reject(new Error('invalid-origin'))
      );
      await expect(
        resolver._openRedirect(auth, provider, event)
      ).to.be.rejectedWith(Error, 'invalid-origin');
    });
  });

  context('#_initialize', () => {
    it('returns different manager for a different auth', async () => {
      const manager = await resolver._initialize(auth);
      expect(await resolver._initialize(auth)).to.eq(manager);

      const secondAuth = await testAuth();
      secondAuth.config.authDomain = 'something-else';
      const secondManager = await resolver._initialize(secondAuth);
      expect(secondManager).not.to.eq(manager);
      expect(await resolver._initialize(secondAuth)).to.eq(secondManager);
    });

    it('initialization promise is cached as well for diff auths', async () => {
      const promise = resolver._initialize(auth);
      expect(resolver._initialize(auth)).to.eq(promise);

      const secondAuth = await testAuth();
      secondAuth.config.authDomain = 'something-else';
      const secondPromise = resolver._initialize(secondAuth);
      expect(secondPromise).not.to.eq(promise);
      expect(resolver._initialize(secondAuth)).to.eq(secondPromise);
    });

    it('iframe event goes through to the manager', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      sinon.stub(manager, 'onEvent').returns(true);
      const response = await onIframeMessage({
        type: 'authEvent',
        authEvent: { type: AuthEventType.LINK_VIA_POPUP } as AuthEvent
      });

      expect(manager.onEvent).to.have.been.calledWith({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(response).to.eql({
        status: 'ACK'
      });
    });

    it('errors with invalid event if null event', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      sinon.stub(manager, 'onEvent').returns(true);

      expect(() =>
        onIframeMessage({
          type: 'authEvent',
          authEvent: (null as unknown) as AuthEvent
        })
      ).to.throw(FirebaseError, 'auth/invalid-auth-event');
    });

    it('errors with invalid event if everything is null', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      sinon.stub(manager, 'onEvent').returns(true);
      expect(() =>
        onIframeMessage((null as unknown) as GapiAuthEvent)
      ).to.throw(FirebaseError, 'auth/invalid-auth-event');
    });

    it('returns error to the iframe if the event was not handled', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      sinon.stub(manager, 'onEvent').returns(false);
      const response = await onIframeMessage({
        type: 'authEvent',
        authEvent: { type: AuthEventType.LINK_VIA_POPUP } as AuthEvent
      });

      expect(manager.onEvent).to.have.been.calledWith({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(response).to.eql({
        status: 'ERROR'
      });
    });
  });

  context('#_isIframeWebStorageSupported', () => {
    beforeEach(async () => {
      await resolver._initialize(auth);
    });

    function setIframeResponse(value: unknown): void {
      iframeSendStub.callsFake(
        (
          _message: string,
          _event: unknown,
          callback: (response: unknown) => void
        ) => {
          callback(value);
        }
      );
    }

    it('calls the iframe send method with the correct parameters', () => {
      resolver._isIframeWebStorageSupported(auth, () => {});
      expect(iframeSendStub).to.have.been.calledOnce;
      const args = iframeSendStub.getCalls()[0].args;
      expect(args[0]).to.eq('webStorageSupport');
      expect(args[1]).to.eql({
        type: 'webStorageSupport'
      });
      expect(args[3]).to.eq(gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
    });

    it('passes through true value from the response to the callback', done => {
      setIframeResponse([{ webStorageSupport: true }]);
      resolver._isIframeWebStorageSupported(auth, supported => {
        expect(supported).to.be.true;
        done();
      });
    });

    it('passes through false value from the response to callback', done => {
      setIframeResponse([{ webStorageSupport: false }]);
      resolver._isIframeWebStorageSupported(auth, supported => {
        expect(supported).to.be.false;
        done();
      });
    });

    it('throws an error if the response is malformed', () => {
      setIframeResponse({});
      expect(() =>
        resolver._isIframeWebStorageSupported(auth, () => {})
      ).to.throw(FirebaseError, 'auth/internal-error');
    });
  });
});
