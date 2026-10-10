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

import { PopupRedirectResolver } from '../../model/public_types';
import { OperationType, ProviderId } from '../../model/enums';

import { FirebaseError } from '@firebase/util';

import { delay } from '../../../test/helpers/delay';
import { BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import { stubTimeouts, TimerMap } from '../../../test/helpers/timeout_stub';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';
import { UserInternal } from '../../model/user';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { AuthErrorCode } from '../../core/errors';
import { OAuthProvider } from '../../core/providers/oauth';
import { UserCredentialImpl } from '../../core/user/user_credential_impl';
import * as eid from '../../core/util/event_id';
import { AuthPopup } from '../util/popup';
import * as idpTasks from '../../core/strategies/idp';
import {
  _Timeout,
  _POLL_WINDOW_CLOSE_TIMEOUT,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup
} from './popup';
import { _getInstance } from '../../core/util/instantiator';
import { _createError } from '../../core/util/assert';

vi.mock('../../core/util/event_id', { spy: true });
vi.mock('../../core/strategies/idp', { spy: true });
const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

describe('platform_browser/strategies/popup', () => {
  let resolver: PopupRedirectResolver;
  let provider: OAuthProvider;
  let eventManager: AuthEventManager;
  let authPopup: AuthPopup;
  let underlyingWindow: { closed: boolean };
  let auth: TestAuth;
  let idpStubs: any;
  let pendingTimeouts: TimerMap;

  beforeEach(async () => {
    vi.clearAllMocks();
    auth = await testAuth();
    eventManager = new AuthEventManager(auth);
    underlyingWindow = { closed: false };
    authPopup = new AuthPopup(underlyingWindow as Window);
    provider = new OAuthProvider(ProviderId.GOOGLE);
    resolver = makeMockPopupRedirectResolver(eventManager, authPopup);
    idpStubs = idpTasks;
    vi.spyOn(eid, '_generateEventId').mockReturnValue(MATCHING_EVENT_ID);
    pendingTimeouts = stubTimeouts();
    vi.spyOn(window, 'clearTimeout');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  describe('signInWithPopup', () => {
    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('completes the full flow with default resolver', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      auth._popupRedirectResolver = _getInstance(resolver);
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('errors if resolver not provided and not on auth', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      await expect(signInWithPopup(auth, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP,
        eventId: OTHER_EVENT_ID,
        error: {
          code: 'auth/internal-error',
          message: '',
          name: ''
        }
      });

      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP,
        eventId: MATCHING_EVENT_ID
      });
      expect(await promise).toBe(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP,
        eventId: MATCHING_EVENT_ID,
        error: {
          code: 'auth/invalid-app-credential',
          message: '',
          name: ''
        }
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._signIn).not.toHaveBeenCalled();
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_Timeout.AUTH_EVENT]();
      });
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('errors if webstorage support comes back negative', async () => {
      resolver = makeMockPopupRedirectResolver(eventManager, authPopup, false);
      await expect(signInWithPopup(auth, provider, resolver)).rejects.toThrow(
        FirebaseError,
        'auth/web-storage-unsupported'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._signIn.mockRejectedValue(
        _createError(auth, AuthErrorCode.INVALID_APP_ID)
      );
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });

      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-id'
      );
    });

    it('cancels the task if called consecutively', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.mockReturnValue(Promise.resolve(cred));
      const firstPromise = signInWithPopup(auth, provider, resolver);
      const secondPromise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      await expect(firstPromise).rejects.toThrow(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).toBe(cred);
    });
  });

  describe('linkWithPopup', () => {
    let user: UserInternal;
    beforeEach(() => {
      user = testUser(auth, 'uid');
    });

    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('completes the full flow with default resolver', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      user.auth._popupRedirectResolver = _getInstance(resolver);
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('errors if resolver not provided and not on auth', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      await expect(linkWithPopup(user, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP,
        eventId: OTHER_EVENT_ID,
        error: {
          code: 'auth/internal-error',
          message: '',
          name: ''
        }
      });

      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP,
        eventId: MATCHING_EVENT_ID
      });
      expect(await promise).toBe(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP,
        eventId: MATCHING_EVENT_ID,
        error: {
          code: 'auth/invalid-app-credential',
          message: '',
          name: ''
        }
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._link).not.toHaveBeenCalled();
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_Timeout.AUTH_EVENT]();
      });
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('errors if webstorage support comes back negative', async () => {
      resolver = makeMockPopupRedirectResolver(eventManager, authPopup, false);
      await expect(linkWithPopup(user, provider, resolver)).rejects.toThrow(
        FirebaseError,
        'auth/web-storage-unsupported'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._link.mockRejectedValue(
        _createError(auth, AuthErrorCode.INVALID_APP_ID)
      );
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.LINK_VIA_POPUP
      });

      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-id'
      );
    });

    it('cancels the task if called consecutively', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.mockReturnValue(Promise.resolve(cred));
      const firstPromise = linkWithPopup(user, provider, resolver);
      const secondPromise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      await expect(firstPromise).rejects.toThrow(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).toBe(cred);
    });
  });

  describe('reauthenticateWithPopup', () => {
    let user: UserInternal;
    beforeEach(() => {
      user = testUser(auth, 'uid');
    });

    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('completes the full flow with default resolver', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      user.auth._popupRedirectResolver = _getInstance(resolver);
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('errors if resolver not provided and not on auth', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      await expect(reauthenticateWithPopup(user, provider)).rejects.toThrow(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP,
        eventId: OTHER_EVENT_ID,
        error: {
          code: 'auth/internal-error',
          message: '',
          name: ''
        }
      });

      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP,
        eventId: MATCHING_EVENT_ID
      });
      expect(await promise).toBe(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP,
        eventId: MATCHING_EVENT_ID,
        error: {
          code: 'auth/invalid-app-credential',
          message: '',
          name: ''
        }
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._reauth).not.toHaveBeenCalled();
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      expect(await promise).toBe(cred);
    });

    it('errors if webstorage support comes back negative', async () => {
      resolver = makeMockPopupRedirectResolver(eventManager, authPopup, false);
      await expect(
        reauthenticateWithPopup(user, provider, resolver)
      ).rejects.toThrow(FirebaseError, 'auth/web-storage-unsupported');
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_Timeout.AUTH_EVENT]();
      });
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._reauth.mockRejectedValue(
        _createError(auth, AuthErrorCode.INVALID_APP_ID)
      );
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.REAUTH_VIA_POPUP
      });

      await expect(promise).rejects.toThrow(
        FirebaseError,
        'auth/invalid-app-id'
      );
    });

    it('cancels the task if called consecutively', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.mockReturnValue(Promise.resolve(cred));
      const firstPromise = reauthenticateWithPopup(user, provider, resolver);
      const secondPromise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      await expect(firstPromise).rejects.toThrow(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).toBe(cred);
    });
  });
});
