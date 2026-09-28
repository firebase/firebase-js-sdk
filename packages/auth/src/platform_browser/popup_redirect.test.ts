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

import { SDK_VERSION } from '@firebase/app';
import { Config } from '../model/public_types';
import { ProviderId } from '../model/enums';

import { FirebaseError } from '@firebase/util';

import {
  TEST_AUTH_DOMAIN,
  TEST_KEY,
  testAuth,
  TestAuth,
  FAKE_APP_CHECK_CONTROLLER
} from '../../test/helpers/mock_auth';
import { AuthEventManager } from '../core/auth/auth_event_manager';
import { OAuthProvider } from '../core/providers/oauth';
import { SingletonInstantiator } from '../core/util/instantiator';
import * as validateOrigin from '../core/util/validate_origin';
import {
  AuthEvent,
  AuthEventType,
  GapiAuthEvent,
  PopupRedirectResolverInternal
} from '../model/popup_redirect';
import * as authWindow from './auth_window';
import * as gapiLoader from './iframe/gapi';
import { browserPopupRedirectResolver } from './popup_redirect';
import { MockInstance } from 'vitest';

vi.mock('../core/util/validate_origin', { spy: true });
vi.mock('./iframe/gapi', { spy: true });
vi.mock('./auth_window', { spy: true });
describe('platform_browser/popup_redirect', () => {
  let resolver: PopupRedirectResolverInternal;
  let auth: TestAuth;
  let onIframeMessage: (event: GapiAuthEvent) => Promise<void>;
  let iframeSendStub: MockInstance;
  let loadGapiStub: MockInstance;

  beforeEach(async () => {
    auth = await testAuth();
    resolver = new (
      browserPopupRedirectResolver as SingletonInstantiator<PopupRedirectResolverInternal>
    )();

    vi.spyOn(validateOrigin, '_validateOrigin').mockReturnValue(
      Promise.resolve()
    );
    iframeSendStub = vi.fn();
    loadGapiStub = vi.spyOn(gapiLoader, '_loadGapi');
    setGapiStub();

    (authWindow._window() as any).gapi = {
      iframes: {
        CROSS_ORIGIN_IFRAMES_FILTER: 'cross-origin-iframes-filter'
      }
    };
  });

  function setGapiStub(): void {
    loadGapiStub.mockReturnValue(
      Promise.resolve({
        open: () =>
          Promise.resolve({
            register: (
              _message: string,
              cb: (event: GapiAuthEvent) => Promise<void>
            ) => (onIframeMessage = cb),
            send: iframeSendStub
          })
      } as unknown as gapi.iframes.Context)
    );
  }

  afterEach(() => {
    delete (authWindow._window() as any).gapi;
    sinon.restore();
    vi.restoreAllMocks();
  });

  describe('#_openPopup', () => {
    let popupUrl: string | URL | undefined;
    let provider: OAuthProvider;
    const event = AuthEventType.LINK_VIA_POPUP;

    beforeEach(async () => {
      vi.spyOn(window, 'open').mockImplementation(url => {
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
      expect(popupUrl).toContain(`https://${TEST_AUTH_DOMAIN}/__/auth/handler`);
      expect(popupUrl).toContain(`apiKey=${TEST_KEY}`);
      expect(popupUrl).toContain('appName=test-app');
      expect(popupUrl).toContain(`authType=${AuthEventType.LINK_VIA_POPUP}`);
      expect(popupUrl).toContain(`v=${SDK_VERSION}`);
      expect(popupUrl).toContain('scopes=some-scope-a%2Csome-scope-b');
      expect(popupUrl).toContain(
        'customParameters=%7B%22foo%22%3A%22bar%22%7D'
      );
    });

    it('includes the App Check token in the url fragment if present', async () => {
      await resolver._initialize(auth);
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: 'fake-token' })
      );

      await resolver._openPopup(auth, provider, event);

      const matches = (popupUrl as string).match(/.*?#(.*)/);
      expect(matches).not.toBeNull();
      const fragment = matches![1];
      expect(fragment).toContain('fac=fake-token');
    });

    it('does not add the App Check token in the url fragment if none returned', async () => {
      await resolver._initialize(auth);
      // Redundant, already set in mock_auth.ts but adding here for clarity
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: '' })
      );

      await resolver._openPopup(auth, provider, event);

      const matches = (popupUrl as string).match(/.*?#(.*)/);
      // The '#' character will not be included when the url fragment is not attached,
      // so the url will not match the pattern
      expect(matches).toBeNull();
    });

    it('does not add the App Check token in the url fragment if controller unavailable', async () => {
      await resolver._initialize(auth);
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        undefined as any
      );

      await resolver._openPopup(auth, provider, event);

      const matches = (popupUrl as string).match(/.*?#(.*)/);
      // The '#' character will not be included when the url fragment is not attached,
      // so the url will not match the pattern
      expect(matches).toBeNull();
    });

    it('throws an error if apiKey is unspecified', async () => {
      delete (auth.config as Partial<Config>).apiKey;
      await resolver._initialize(auth);

      await expect(resolver._openPopup(auth, provider, event)).rejects.toThrow(
        FirebaseError,
        'auth/invalid-api-key'
      );
    });
  });

  describe('#_openRedirect', () => {
    let newWindowLocation: string;
    let provider: OAuthProvider;
    const event = AuthEventType.LINK_VIA_POPUP;

    beforeEach(async () => {
      provider = new OAuthProvider(ProviderId.GOOGLE);
      await resolver._initialize(auth);
      vi.spyOn(authWindow, '_setWindowLocation').mockImplementation(url => {
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

      // Wait a bit so the _openRedirect() call completes
      await new Promise((resolve): void => {
        setTimeout(resolve, 100);
      });

      expect(newWindowLocation).toContain(
        `https://${TEST_AUTH_DOMAIN}/__/auth/handler`
      );
      expect(newWindowLocation).toContain(`apiKey=${TEST_KEY}`);
      expect(newWindowLocation).toContain('appName=test-app');
      expect(newWindowLocation).toContain(
        `authType=${AuthEventType.LINK_VIA_POPUP}`
      );
      expect(newWindowLocation).toContain(`v=${SDK_VERSION}`);
      expect(newWindowLocation).toContain('scopes=some-scope-a%2Csome-scope-b');
      expect(newWindowLocation).toContain(
        'customParameters=%7B%22foo%22%3A%22bar%22%7D'
      );
    });

    it('includes the App Check token in the url fragment if present', async () => {
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: 'fake-token' })
      );

      // This promise will never resolve on purpose
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      resolver._openRedirect(auth, provider, event);

      // Wait a bit so the _openRedirect() call completes
      await new Promise((resolve): void => {
        setTimeout(resolve, 100);
      });

      const matches = newWindowLocation.match(/.*?#(.*)/);
      expect(matches).not.toBeNull();
      const fragment = matches![1];
      expect(fragment).toContain('fac=fake-token');
    });

    it('does not add the App Check token in the url fragment if none returned', async () => {
      // Redundant, already set in mock_auth.ts but adding here for clarity
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        Promise.resolve({ token: '' })
      );

      // This promise will never resolve on purpose
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      resolver._openRedirect(auth, provider, event);

      // Wait a bit so the _openRedirect() call completes
      await new Promise((resolve): void => {
        setTimeout(resolve, 100);
      });

      const matches = newWindowLocation.match(/.*?#(.*)/);
      // The '#' character will not be included when the url fragment is not attached,
      // so the url will not match the pattern
      expect(matches).toBeNull();
    });

    it('does not add the App Check token in the url fragment if controller unavailable', async () => {
      vi.spyOn(FAKE_APP_CHECK_CONTROLLER, 'getToken').mockReturnValue(
        undefined as any
      );

      // This promise will never resolve on purpose
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      resolver._openRedirect(auth, provider, event);

      // Wait a bit so the _openRedirect() call completes
      await new Promise((resolve): void => {
        setTimeout(resolve, 100);
      });

      const matches = newWindowLocation.match(/.*?#(.*)/);
      // The '#' character will not be included when the url fragment is not attached,
      // so the url will not match the pattern
      expect(matches).toBeNull();
    });

    it('throws an error if authDomain is unspecified', async () => {
      delete auth.config.authDomain;

      await expect(
        resolver._openRedirect(auth, provider, event)
      ).rejects.toThrow(FirebaseError, 'auth/auth-domain-config-required');
    });

    it('throws an error if apiKey is unspecified', async () => {
      delete (auth.config as Partial<Config>).apiKey;

      await expect(
        resolver._openRedirect(auth, provider, event)
      ).rejects.toThrow(FirebaseError, 'auth/invalid-api-key');
    });

    it('rejects immediately if origin validation fails', async () => {
      (validateOrigin._validateOrigin as MockInstance).mockReturnValue(
        Promise.reject(new Error('invalid-origin'))
      );
      await expect(
        resolver._openRedirect(auth, provider, event)
      ).rejects.toThrow(Error, 'invalid-origin');
    });
  });

  describe('#_originValidation', () => {
    it('validates the origin', async () => {
      await resolver._initialize(auth);

      await resolver._originValidation(auth);
      expect(validateOrigin._validateOrigin).toHaveBeenCalledWith(auth);
    });

    it('rejects if origin validation fails', async () => {
      await resolver._initialize(auth);
      (validateOrigin._validateOrigin as MockInstance).mockReturnValue(
        Promise.reject(new Error('invalid-origin'))
      );

      await expect(resolver._originValidation(auth)).rejects.toThrow(
        Error,
        'invalid-origin'
      );
    });
  });

  describe('#_initialize', () => {
    it('returns different manager for a different auth', async () => {
      const manager = await resolver._initialize(auth);
      expect(await resolver._initialize(auth)).toBe(manager);

      const secondAuth = await testAuth();
      secondAuth.config.authDomain = 'something-else';
      const secondManager = await resolver._initialize(secondAuth);
      expect(secondManager).not.toBe(manager);
      expect(await resolver._initialize(secondAuth)).toBe(secondManager);
    });

    it('initialization promise is cached as well for diff auths', async () => {
      const promise = resolver._initialize(auth);
      expect(resolver._initialize(auth)).toBe(promise);

      const secondAuth = await testAuth();
      secondAuth.config.authDomain = 'something-else';
      const secondPromise = resolver._initialize(secondAuth);
      expect(secondPromise).not.toBe(promise);
      expect(resolver._initialize(secondAuth)).toBe(secondPromise);
    });

    it('clears the cache if the initialize fails', async () => {
      const error = new Error();
      loadGapiStub.mockRejectedValue(error);
      await expect(resolver._initialize(auth)).rejects.toThrow(error);
      setGapiStub(); // Reset the gapi load stub
      await expect(resolver._initialize(auth)).resolves.toBeDefined();
    });

    it('iframe event goes through to the manager', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      vi.spyOn(manager, 'onEvent').mockReturnValue(true);
      const response = await onIframeMessage({
        type: 'authEvent',
        authEvent: { type: AuthEventType.LINK_VIA_POPUP } as AuthEvent
      });

      expect(manager.onEvent).toHaveBeenCalledWith({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(response).toEqual({
        status: 'ACK'
      });
    });

    it('errors with invalid event if null event', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      vi.spyOn(manager, 'onEvent').mockReturnValue(true);

      expect(() =>
        onIframeMessage({
          type: 'authEvent',
          authEvent: null as unknown as AuthEvent
        })
      ).toThrow(FirebaseError, 'auth/invalid-auth-event');
    });

    it('errors with invalid event if everything is null', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      vi.spyOn(manager, 'onEvent').mockReturnValue(true);
      expect(() => onIframeMessage(null as unknown as GapiAuthEvent)).toThrow(
        FirebaseError,
        'auth/invalid-auth-event'
      );
    });

    it('returns error to the iframe if the event was not handled', async () => {
      const manager = (await resolver._initialize(auth)) as AuthEventManager;
      vi.spyOn(manager, 'onEvent').mockReturnValue(false);
      const response = await onIframeMessage({
        type: 'authEvent',
        authEvent: { type: AuthEventType.LINK_VIA_POPUP } as AuthEvent
      });

      expect(manager.onEvent).toHaveBeenCalledWith({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(response).toEqual({
        status: 'ERROR'
      });
    });
  });

  describe('#_isIframeWebStorageSupported', () => {
    beforeEach(async () => {
      await resolver._initialize(auth);
    });

    function setIframeResponse(value: unknown): void {
      iframeSendStub.mockImplementation(
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
      expect(iframeSendStub).toHaveBeenCalledTimes(1);
      const args = iframeSendStub.mock.calls[0];
      expect(args[0]).toBe('webStorageSupport');
      expect(args[1]).toEqual({
        type: 'webStorageSupport'
      });
      expect(args[3]).toBe('cross-origin-iframes-filter');
    });

    it('passes through true value from the response to the callback', () => {
      setIframeResponse([{ webStorageSupport: true }]);
      return new Promise<void>(resolve => {
        resolver._isIframeWebStorageSupported(auth, supported => {
          expect(supported).toBe(true);
          resolve();
        });
      });
    });

    it('passes through false value from the response to callback', () => {
      setIframeResponse([{ webStorageSupport: false }]);
      return new Promise<void>(resolve => {
        resolver._isIframeWebStorageSupported(auth, supported => {
          expect(supported).toBe(false);
          resolve();
        });
      });
    });

    it('throws an error if the response is malformed', () => {
      setIframeResponse({});
      expect(() =>
        resolver._isIframeWebStorageSupported(auth, () => {})
      ).toThrow(FirebaseError, 'auth/internal-error');
    });
  });
});
