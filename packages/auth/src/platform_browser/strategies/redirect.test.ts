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

import { AuthError, PopupRedirectResolver } from '../../model/public_types';
import { OperationType, ProviderId } from '../../model/enums';

import { delay } from '../../../test/helpers/delay';
import { BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import {
  MockPersistenceLayer,
  testAuth,
  TestAuth,
  testUser
} from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { UserInternal } from '../../model/user';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { AuthErrorCode } from '../../core/errors';
import { PersistenceInternal } from '../../core/persistence';
import { OAuthProvider } from '../../core/providers/oauth';
import * as link from '../../core/user/link_unlink';
import { UserCredentialImpl } from '../../core/user/user_credential_impl';
import { _clearInstanceMap, _getInstance } from '../../core/util/instantiator';
import * as idpTasks from '../../core/strategies/idp';
import {
  getRedirectResult,
  linkWithRedirect,
  reauthenticateWithRedirect,
  signInWithRedirect,
  _getRedirectResult
} from './redirect';
import { FirebaseError } from '@firebase/util';
import { _clearRedirectOutcomes } from '../../core/strategies/redirect';
import { RedirectPersistence } from '../../../test/helpers/redirect_persistence';

vi.mock('../../core/user/link_unlink', { spy: true });
vi.mock('../../core/strategies/idp', { spy: true });

const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

describe('platform_browser/strategies/redirect', () => {
  let auth: TestAuth;
  let eventManager: AuthEventManager;
  let provider: OAuthProvider;
  let resolver: PopupRedirectResolver;

  beforeEach(async () => {
    eventManager = new AuthEventManager({} as unknown as TestAuth);
    provider = new OAuthProvider(ProviderId.GOOGLE);
    resolver = makeMockPopupRedirectResolver(eventManager);
    _getInstance<PopupRedirectResolverInternal>(resolver)._redirectPersistence =
      RedirectPersistence;
    auth = await testAuth(resolver);
    _getInstance<RedirectPersistence>(RedirectPersistence).hasPendingRedirect =
      true;
  });

  afterEach(() => {
    sinon.restore();
    vi.restoreAllMocks();
    _clearRedirectOutcomes();
    _clearInstanceMap();
  });

  describe('signInWithRedirect', () => {
    it('redirects the window', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await signInWithRedirect(auth, provider, resolver);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.SIGN_IN_VIA_REDIRECT
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await signInWithRedirect(auth, provider);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.SIGN_IN_VIA_REDIRECT
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(signInWithRedirect(auth, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('awaits on the auth initialization promise before opening redirect', async () => {
      // Obtain an auth instance which does not await on the initialization promise.
      const authWithoutAwait: TestAuth = await testAuth(
        resolver,
        undefined,
        true
      );
      // completeRedirectFn calls getRedirectResult under the hood.
      const getRedirectResultSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_completeRedirectFn'
      );
      const openRedirectSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await signInWithRedirect(authWithoutAwait, provider);
      expect(getRedirectResultSpy).toHaveBeenCalled();
      expect(getRedirectResultSpy.mock.invocationCallOrder[0]).toBeLessThan(
        openRedirectSpy.mock.invocationCallOrder[0]
      );
      expect(getRedirectResultSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        resolver,
        true
      );
      expect(openRedirectSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        provider,
        AuthEventType.SIGN_IN_VIA_REDIRECT
      );
    });
  });

  describe('linkWithRedirect', () => {
    let user: UserInternal;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth._updateCurrentUser(user);
      vi.spyOn(link, '_assertLinkedStatus').mockReturnValue(Promise.resolve());
    });

    it('redirects the window', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await linkWithRedirect(user, provider, resolver);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.LINK_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await linkWithRedirect(user, provider);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.LINK_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('awaits on the auth initialization promise before opening redirect', async () => {
      // Obtain an auth instance which does not await on the initialization promise.
      const authWithoutAwait: TestAuth = await testAuth(
        resolver,
        undefined,
        true
      );
      user = testUser(authWithoutAwait, 'uid', 'email', true);
      // completeRedirectFn calls getRedirectResult under the hood.
      const getRedirectResultSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_completeRedirectFn'
      );
      const openRedirectSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await authWithoutAwait._updateCurrentUser(user);
      await linkWithRedirect(user, provider, resolver);
      expect(getRedirectResultSpy).toHaveBeenCalled();
      expect(getRedirectResultSpy.mock.invocationCallOrder[0]).toBeLessThan(
        openRedirectSpy.mock.invocationCallOrder[0]
      );
      expect(getRedirectResultSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        resolver,
        true
      );
      expect(openRedirectSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        provider,
        AuthEventType.LINK_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(linkWithRedirect(user, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('persists the redirect user and current user', async () => {
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_set');
      vi.spyOn(auth.persistenceLayer, '_set');

      await linkWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(typeof user._redirectEventId).toBe('string');
    });

    it('persists the redirect user but not current user if diff currentUser', async () => {
      await auth._updateCurrentUser(testUser(auth, 'not-uid', 'email', true));
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_set');
      vi.spyOn(auth.persistenceLayer, '_set');

      await linkWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).not.toHaveBeenCalled();
      expect(typeof user._redirectEventId).toBe('string');
    });
  });

  describe('reauthenticateWithRedirect', () => {
    let user: UserInternal;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth._updateCurrentUser(user);
    });

    it('redirects the window', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await reauthenticateWithRedirect(user, provider, resolver);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await reauthenticateWithRedirect(user, provider);
      expect(spy).toHaveBeenCalledWith(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('awaits on the auth initialization promise before opening redirect', async () => {
      // Obtain an auth instance which does not await on the initialization promise.
      const authWithoutAwait: TestAuth = await testAuth(
        resolver,
        undefined,
        true
      );
      user = testUser(authWithoutAwait, 'uid', 'email', true);
      // completeRedirectFn calls getRedirectResult under the hood.
      const getRedirectResultSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_completeRedirectFn'
      );
      const openRedirectSpy = vi.spyOn(
        _getInstance<PopupRedirectResolverInternal>(resolver),
        '_openRedirect'
      );
      await authWithoutAwait._updateCurrentUser(user);
      await signInWithRedirect(authWithoutAwait, provider);
      await reauthenticateWithRedirect(user, provider);
      expect(getRedirectResultSpy).toHaveBeenCalled();
      expect(getRedirectResultSpy.mock.invocationCallOrder[0]).toBeLessThan(
        openRedirectSpy.mock.invocationCallOrder[0]
      );
      expect(getRedirectResultSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        resolver,
        true
      );
      expect(openRedirectSpy).toHaveBeenCalledWith(
        authWithoutAwait,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT,
        expect.any(String)
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(reauthenticateWithRedirect(user, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('persists the redirect user and current user', async () => {
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_set');
      vi.spyOn(auth.persistenceLayer, '_set');

      await reauthenticateWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).toHaveBeenCalledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(typeof user._redirectEventId).toBe('string');
    });

    it('persists the redirect user but not current user if diff currentUser', async () => {
      await auth._updateCurrentUser(testUser(auth, 'not-uid', 'email', true));
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_set');
      vi.spyOn(auth.persistenceLayer, '_set');

      await reauthenticateWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).not.toHaveBeenCalled();
      expect(typeof user._redirectEventId).toBe('string');
    });
  });

  describe('getRedirectResult', () => {
    function iframeEvent(event: Partial<AuthEvent>): void {
      // Push the dispatch out of the synchronous flow
      delay(() => {
        eventManager.onEvent({
          ...BASE_AUTH_EVENT,
          eventId: MATCHING_EVENT_ID,
          ...event
        });
      });
    }

    async function reInitAuthWithRedirectUser(eventId: string): Promise<void> {
      const redirectPersistence: RedirectPersistence =
        _getInstance(RedirectPersistence);
      const mainPersistence = new MockPersistenceLayer();
      const oldAuth = await testAuth();
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = eventId;
      redirectPersistence.redirectUser = user.toJSON();
      vi.spyOn(mainPersistence, '_get').mockReturnValue(
        Promise.resolve(user.toJSON())
      );

      auth = await testAuth(resolver, mainPersistence);
    }

    it('completes the proper flow', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      vi.spyOn(idpTasks, '_signIn').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
    });

    it('returns null after the first call', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      vi.spyOn(idpTasks, '_signIn').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
      expect(await getRedirectResult(auth, resolver)).toBeNull();
    });

    it('interacts with redirectUser loading from auth object', async () => {
      // We need to re-initialize auth since it pulls the redirect user at
      // auth load
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      vi.spyOn(idpTasks, '_link').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
    });

    it('returns null if the event id mismatches', async () => {
      // We need to re-initialize auth since it pulls the redirect user at
      // auth load
      await reInitAuthWithRedirectUser(OTHER_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      vi.spyOn(idpTasks, '_link').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).toBeNull();
    });

    it('returns null if there is no pending redirect', async () => {
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.UNKNOWN,
        error: {
          code: `auth/${AuthErrorCode.NO_AUTH_EVENT}`
        } as AuthError
      });
      expect(await promise).toBeNull();
    });

    it('works with reauthenticate', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      vi.spyOn(idpTasks, '_reauth').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
      expect(await getRedirectResult(auth, resolver)).toBeNull();
    });

    it('removes the redirect user and clears eventId from currentuser', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_remove');

      const cred = new UserCredentialImpl({
        user: auth._currentUser!,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      vi.spyOn(idpTasks, '_link').mockReturnValue(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
      expect(redirectPersistence._remove).toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app'
      );
      expect(auth._currentUser?._redirectEventId).toBeUndefined();
      expect(
        auth.persistenceLayer.lastObjectSet?._redirectEventId
      ).toBeUndefined();
    });

    it('does not mutate authstate if bypassAuthState is true', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);
      const redirectPersistence: PersistenceInternal =
        _getInstance(RedirectPersistence);
      vi.spyOn(redirectPersistence, '_remove');

      const cred = new UserCredentialImpl({
        user: auth._currentUser!,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      vi.spyOn(idpTasks, '_link').mockReturnValue(Promise.resolve(cred));
      const promise = _getRedirectResult(auth, resolver, true);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).toBe(cred);
      expect(redirectPersistence._remove).not.toHaveBeenCalledWith(
        'firebase:redirectUser:test-api-key:test-app'
      );
      expect(auth._currentUser?._redirectEventId).toBeDefined();
      expect(
        auth.persistenceLayer.lastObjectSet?._redirectEventId
      ).toBeDefined();
    });
  });
});
