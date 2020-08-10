/**
 * @license
 * Copyright 2020 Google LLC.
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

import {
  OperationType,
  PopupRedirectResolver,
  ProviderId
} from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { delay } from '../../../test/helpers/delay';
import { BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import { stubTimeouts, TimerMap } from '../../../test/helpers/timeout_stub';
import { AuthEvent, AuthEventType } from '../../model/popup_redirect';
import { User } from '../../model/user';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../../core/errors';
import { OAuthProvider } from '../../core/providers/oauth';
import { UserCredentialImpl } from '../../core/user/user_credential_impl';
import * as eid from '../../core/util/event_id';
import { AuthPopup } from '../util/popup';
import * as idpTasks from '../../core/strategies/idp';
import {
  _AUTH_EVENT_TIMEOUT,
  _POLL_WINDOW_CLOSE_TIMEOUT,
  linkWithPopup,
  reauthenticateWithPopup,
  signInWithPopup
} from './popup';

use(sinonChai);
use(chaiAsPromised);

const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

describe('src/core/strategies/popup', () => {
  let resolver: PopupRedirectResolver;
  let provider: OAuthProvider;
  let eventManager: AuthEventManager;
  let authPopup: AuthPopup;
  let underlyingWindow: { closed: boolean };
  let auth: TestAuth;
  let idpStubs: sinon.SinonStubbedInstance<typeof idpTasks>;
  let pendingTimeouts: TimerMap;

  beforeEach(async () => {
    auth = await testAuth();
    eventManager = new AuthEventManager(auth.name);
    underlyingWindow = { closed: false };
    authPopup = new AuthPopup(underlyingWindow as Window);
    provider = new OAuthProvider(ProviderId.GOOGLE);
    resolver = makeMockPopupRedirectResolver(eventManager, authPopup);
    idpStubs = sinon.stub(idpTasks);
    sinon.stub(eid, '_generateEventId').returns(MATCHING_EVENT_ID);
    pendingTimeouts = stubTimeouts();
    sinon.stub(window, 'clearTimeout');
  });

  afterEach(() => {
    sinon.restore();
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

  context('signInWithPopup', () => {
    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
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
      expect(await promise).to.eq(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
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
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._signIn).not.to.have.been.called;
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
      const promise = signInWithPopup(auth, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_AUTH_EVENT_TIMEOUT]();
      });
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._signIn.returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.INVALID_APP_ID, {
            appName: auth.name
          })
        )
      );
      const promise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });

      await expect(promise).to.be.rejectedWith(
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
      idpStubs._signIn.returns(Promise.resolve(cred));
      const firstPromise = signInWithPopup(auth, provider, resolver);
      const secondPromise = signInWithPopup(auth, provider, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_POPUP
      });
      await expect(firstPromise).to.be.rejectedWith(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).to.eq(cred);
    });
  });

  context('linkWithPopup', () => {
    let user: User;
    beforeEach(() => {
      user = testUser(auth, 'uid');
    });

    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
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
      expect(await promise).to.eq(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
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
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._link).not.to.have.been.called;
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = linkWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_AUTH_EVENT_TIMEOUT]();
      });
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._link.returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.INVALID_APP_ID, {
            appName: auth.name
          })
        )
      );
      const promise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.LINK_VIA_POPUP
      });

      await expect(promise).to.be.rejectedWith(
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
      idpStubs._link.returns(Promise.resolve(cred));
      const firstPromise = linkWithPopup(user, provider, resolver);
      const secondPromise = linkWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_POPUP
      });
      await expect(firstPromise).to.be.rejectedWith(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).to.eq(cred);
    });
  });

  context('reauthenticateWithPopup', () => {
    let user: User;
    beforeEach(() => {
      user = testUser(auth, 'uid');
    });

    it('completes the full flow', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('ignores events for another event id', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
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
      expect(await promise).to.eq(cred);
    });

    it('does not call idp tasks if event is error', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
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
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/invalid-app-credential'
      );
      expect(idpStubs._reauth).not.to.have.been.called;
    });

    it('does not error if the poll timeout trips', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
      });
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      expect(await promise).to.eq(cred);
    });

    it('does error if the poll timeout and event timeout trip', async () => {
      const cred = new UserCredentialImpl({
        user,
        providerId: ProviderId.GOOGLE,
        operationType: OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
      const promise = reauthenticateWithPopup(user, provider, resolver);
      delay(() => {
        underlyingWindow.closed = true;
        pendingTimeouts[_POLL_WINDOW_CLOSE_TIMEOUT.get()]();
        pendingTimeouts[_AUTH_EVENT_TIMEOUT]();
      });
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      await expect(promise).to.be.rejectedWith(
        FirebaseError,
        'auth/popup-closed-by-user'
      );
    });

    it('passes any errors from idp task', async () => {
      idpStubs._reauth.returns(
        Promise.reject(
          AUTH_ERROR_FACTORY.create(AuthErrorCode.INVALID_APP_ID, {
            appName: auth.name
          })
        )
      );
      const promise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        eventId: MATCHING_EVENT_ID,
        type: AuthEventType.REAUTH_VIA_POPUP
      });

      await expect(promise).to.be.rejectedWith(
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
      idpStubs._reauth.returns(Promise.resolve(cred));
      const firstPromise = reauthenticateWithPopup(user, provider, resolver);
      const secondPromise = reauthenticateWithPopup(user, provider, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_POPUP
      });
      await expect(firstPromise).to.be.rejectedWith(
        FirebaseError,
        'auth/cancelled-popup-request'
      );
      expect(await secondPromise).to.eq(cred);
    });
  });
});
