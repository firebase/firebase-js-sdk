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

import * as exp from '@firebase/auth/internal';
import * as platform from './platform';

vi.mock('./platform', { spy: true });
import { CompatPopupRedirectResolver } from './popup_redirect';
import { FirebaseApp } from '@firebase/app-compat';
import {
  FAKE_APP_CHECK_CONTROLLER_PROVIDER,
  FAKE_HEARTBEAT_CONTROLLER_PROVIDER
} from '../test/helpers/fake_providers';

describe.skipIf(typeof window === 'undefined')(
  'popup_redirect/CompatPopupRedirectResolver',
  () => {
    let compatResolver: CompatPopupRedirectResolver;
    let auth: exp.AuthImpl;

    beforeEach(() => {
      compatResolver = new CompatPopupRedirectResolver();
      const app = { options: { apiKey: 'api-key' } } as FirebaseApp;
      auth = new exp.AuthImpl(
        app,
        FAKE_HEARTBEAT_CONTROLLER_PROVIDER,
        FAKE_APP_CHECK_CONTROLLER_PROVIDER,
        {
          apiKey: 'api-key'
        } as exp.ConfigInternal
      );
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('initialization and resolver selection', () => {
      let browserResolver: exp.PopupRedirectResolverInternal;
      let cordovaResolver: exp.PopupRedirectResolverInternal;

      beforeEach(() => {
        browserResolver = exp._getInstance<exp.PopupRedirectResolverInternal>(
          exp.browserPopupRedirectResolver
        );
        cordovaResolver = exp._getInstance<exp.PopupRedirectResolverInternal>(
          exp.cordovaPopupRedirectResolver
        );
        vi.spyOn(browserResolver, '_initialize').mockImplementation(
          async () => ({}) as any
        );
        vi.spyOn(cordovaResolver, '_initialize').mockImplementation(
          async () => ({}) as any
        );
      });

      it('selects the Cordova resolver if in Cordova', async () => {
        vi.mocked(platform._isCordova).mockResolvedValue(true);
        await compatResolver._initialize(auth);
        expect(cordovaResolver._initialize).toHaveBeenCalledWith(auth);
        expect(browserResolver._initialize).not.toHaveBeenCalled();
      });

      it('selects the Browser resolver if in Browser', async () => {
        vi.mocked(platform._isCordova).mockResolvedValue(false);
        await compatResolver._initialize(auth);
        expect(cordovaResolver._initialize).not.toHaveBeenCalled();
        expect(browserResolver._initialize).toHaveBeenCalledWith(auth);
      });
    });

    describe('callthrough methods', () => {
      let underlyingResolver: FakeResolver;
      let provider: exp.AuthProvider;

      beforeEach(() => {
        underlyingResolver = new FakeResolver();
        (
          compatResolver as unknown as {
            underlyingResolver: exp.PopupRedirectResolverInternal;
          }
        ).underlyingResolver = underlyingResolver;
        provider = new exp.GoogleAuthProvider();
      });

      it('_openPopup', async () => {
        await compatResolver._openPopup(
          auth,
          provider,
          exp.AuthEventType.LINK_VIA_POPUP,
          'eventId'
        );
        expect(underlyingResolver._openPopup).toHaveBeenCalledWith(
          auth,
          provider,
          exp.AuthEventType.LINK_VIA_POPUP,
          'eventId'
        );
      });

      it('_openRedirect', async () => {
        await compatResolver._openRedirect(
          auth,
          provider,
          exp.AuthEventType.LINK_VIA_REDIRECT,
          'eventId'
        );
        expect(underlyingResolver._openRedirect).toHaveBeenCalledWith(
          auth,
          provider,
          exp.AuthEventType.LINK_VIA_REDIRECT,
          'eventId'
        );
      });

      it('_isIframeWebStorageSupported', () => {
        const cb = (): void => {};
        compatResolver._isIframeWebStorageSupported(auth, cb);
        expect(
          underlyingResolver._isIframeWebStorageSupported
        ).toHaveBeenCalledWith(auth, cb);
      });

      it('_originValidation', async () => {
        await compatResolver._originValidation(auth);
        expect(underlyingResolver._originValidation).toHaveBeenCalledWith(auth);
      });
    });

    describe('_shouldInitProactively', () => {
      it('returns true if platform may be cordova', () => {
        vi.mocked(platform._isLikelyCordova).mockReturnValue(true);
        expect(compatResolver._shouldInitProactively).toBe(true);
      });

      it('returns true if cordova is false but browser value is true', () => {
        vi.spyOn(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            exp.browserPopupRedirectResolver
          ),
          '_shouldInitProactively',
          'get'
        ).mockReturnValue(true);
        vi.mocked(platform._isLikelyCordova).mockReturnValue(false);
        expect(compatResolver._shouldInitProactively).toBe(true);
      });

      it('returns false if not cordova and not browser early init', () => {
        vi.spyOn(
          exp._getInstance<exp.PopupRedirectResolverInternal>(
            exp.browserPopupRedirectResolver
          ),
          '_shouldInitProactively',
          'get'
        ).mockReturnValue(false);
        vi.mocked(platform._isLikelyCordova).mockReturnValue(false);
        expect(compatResolver._shouldInitProactively).toBe(false);
      });
    });
  }
);

class FakeResolver implements exp.PopupRedirectResolverInternal {
  _completeRedirectFn = vi.fn().mockResolvedValue(null);
  _overrideRedirectResult = vi.fn();
  _redirectPersistence = exp.inMemoryPersistence;
  _shouldInitProactively = true;

  _initialize = vi.fn().mockImplementation(async () => ({}) as any);
  _openPopup = vi.fn().mockImplementation(async () => ({}) as any);
  _openRedirect = vi.fn().mockImplementation(async () => ({}) as any);
  _isIframeWebStorageSupported = vi.fn();
  _originValidation = vi.fn().mockImplementation(async () => {});
}
