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

import * as externs from '@firebase/auth-types-exp';

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
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { User } from '../../model/user';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { AuthErrorCode } from '../../core/errors';
import { Persistence } from '../../core/persistence';
import { InMemoryPersistence } from '../../core/persistence/in_memory';
import { OAuthProvider } from '../../core/providers/oauth';
import * as link from '../../core/user/link_unlink';
import { UserCredentialImpl } from '../../core/user/user_credential_impl';
import { _getInstance } from '../../core/util/instantiator';
import * as idpTasks from '../../core/strategies/idp';
import {
  _clearOutcomes,
  getRedirectResult,
  linkWithRedirect,
  reauthenticateWithRedirect,
  signInWithRedirect,
  _getRedirectResult
} from './redirect';
import { FirebaseError } from '@firebase/util';

use(sinonChai);
use(chaiAsPromised);

const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

class RedirectPersistence extends InMemoryPersistence {}

describe('platform_browser/strategies/redirect', () => {
  let auth: TestAuth;
  let eventManager: AuthEventManager;
  let provider: OAuthProvider;
  let resolver: externs.PopupRedirectResolver;
  let idpStubs: sinon.SinonStubbedInstance<typeof idpTasks>;

  beforeEach(async () => {
    eventManager = new AuthEventManager('test-app');
    provider = new OAuthProvider(externs.ProviderId.GOOGLE);
    resolver = makeMockPopupRedirectResolver(eventManager);
    _getInstance<PopupRedirectResolver>(
      resolver
    )._redirectPersistence = RedirectPersistence;
    auth = await testAuth(resolver);
    idpStubs = sinon.stub(idpTasks);
  });

  afterEach(() => {
    sinon.restore();
    _clearOutcomes();
  });

  context('signInWithRedirect', () => {
    it('redirects the window', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await signInWithRedirect(auth, provider, resolver);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.SIGN_IN_VIA_REDIRECT
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await signInWithRedirect(auth, provider);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.SIGN_IN_VIA_REDIRECT
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(signInWithRedirect(auth, provider)).to.be.rejectedWith(
        FirebaseError,
        'auth/argument-error'
      );
    });
  });

  context('linkWithRedirect', () => {
    let user: User;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth._updateCurrentUser(user);
      sinon.stub(link, '_assertLinkedStatus').returns(Promise.resolve());
    });

    it('redirects the window', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await linkWithRedirect(user, provider, resolver);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.LINK_VIA_REDIRECT
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await linkWithRedirect(user, provider);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.LINK_VIA_REDIRECT
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(linkWithRedirect(user, provider)).to.be.rejectedWith(
        FirebaseError,
        'auth/argument-error'
      );
    });

    it('persists the redirect user and current user', async () => {
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_set');
      sinon.spy(auth.persistenceLayer, '_set');

      await linkWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(typeof user._redirectEventId).to.eq('string');
    });

    it('persists the redirect user but not current user if diff currentUser', async () => {
      await auth._updateCurrentUser(testUser(auth, 'not-uid', 'email', true));
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_set');
      sinon.spy(auth.persistenceLayer, '_set');

      await linkWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).not.to.have.been.called;
      expect(typeof user._redirectEventId).to.eq('string');
    });
  });

  context('reauthenticateWithRedirect', () => {
    let user: User;

    beforeEach(async () => {
      user = testUser(auth, 'uid', 'email', true);
      await auth._updateCurrentUser(user);
    });

    it('redirects the window', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await reauthenticateWithRedirect(user, provider, resolver);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT
      );
    });

    it('redirects the window with auth fallback resolver', async () => {
      const spy = sinon.spy(
        _getInstance<PopupRedirectResolver>(resolver),
        '_openRedirect'
      );
      await reauthenticateWithRedirect(user, provider);
      expect(spy).to.have.been.calledWith(
        auth,
        provider,
        AuthEventType.REAUTH_VIA_REDIRECT
      );
    });

    it('errors if no resolver available', async () => {
      auth._popupRedirectResolver = null;
      await expect(
        reauthenticateWithRedirect(user, provider)
      ).to.be.rejectedWith(FirebaseError, 'auth/argument-error');
    });

    it('persists the redirect user and current user', async () => {
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_set');
      sinon.spy(auth.persistenceLayer, '_set');

      await reauthenticateWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).to.have.been.calledWith(
        'firebase:authUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(typeof user._redirectEventId).to.eq('string');
    });

    it('persists the redirect user but not current user if diff currentUser', async () => {
      await auth._updateCurrentUser(testUser(auth, 'not-uid', 'email', true));
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_set');
      sinon.spy(auth.persistenceLayer, '_set');

      await reauthenticateWithRedirect(user, provider, resolver);
      expect(redirectPersistence._set).to.have.been.calledWith(
        'firebase:redirectUser:test-api-key:test-app',
        user.toJSON()
      );
      expect(auth.persistenceLayer._set).not.to.have.been.called;
      expect(typeof user._redirectEventId).to.eq('string');
    });
  });

  context('getRedirectResult', () => {
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
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      const mainPersistence = new MockPersistenceLayer();
      const oldAuth = await testAuth();
      const user = testUser(oldAuth, 'uid');
      user._redirectEventId = eventId;
      sinon
        .stub(redirectPersistence, '_get')
        .returns(Promise.resolve(user.toJSON()));
      sinon
        .stub(mainPersistence, '_get')
        .returns(Promise.resolve(user.toJSON()));

      auth = await testAuth(resolver, mainPersistence);
    }

    it('completes the proper flow', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
    });

    it('returns the same value if called multiple times', async () => {
      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.SIGN_IN
      });
      idpStubs._signIn.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.SIGN_IN_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
      expect(await getRedirectResult(auth, resolver)).to.eq(cred);
    });

    it('interacts with redirectUser loading from auth object', async () => {
      // We need to re-initialize auth since it pulls the redirect user at
      // auth load
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
    });

    it('returns null if the event id mismatches', async () => {
      // We need to re-initialize auth since it pulls the redirect user at
      // auth load
      await reInitAuthWithRedirectUser(OTHER_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).to.be.null;
    });

    it('returns null if there is no pending redirect', async () => {
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.UNKNOWN,
        error: {
          code: `auth/${AuthErrorCode.NO_AUTH_EVENT}`
        } as externs.AuthError
      });
      expect(await promise).to.be.null;
    });

    it('works with reauthenticate', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);

      const cred = new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.REAUTHENTICATE
      });
      idpStubs._reauth.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.REAUTH_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
      expect(await getRedirectResult(auth, resolver)).to.eq(cred);
    });

    it('removes the redirect user and clears eventId from currentuser', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_remove');

      const cred = new UserCredentialImpl({
        user: auth._currentUser!,
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = getRedirectResult(auth, resolver);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
      expect(redirectPersistence._remove).to.have.been.called;
      expect(auth._currentUser?._redirectEventId).to.be.undefined;
      expect(auth.persistenceLayer.lastObjectSet?._redirectEventId).to.be
        .undefined;
    });

    it('does not mutate authstate if bypassAuthState is true', async () => {
      await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);
      const redirectPersistence: Persistence = _getInstance(
        RedirectPersistence
      );
      sinon.spy(redirectPersistence, '_remove');

      const cred = new UserCredentialImpl({
        user: auth._currentUser!,
        providerId: externs.ProviderId.GOOGLE,
        operationType: externs.OperationType.LINK
      });
      idpStubs._link.returns(Promise.resolve(cred));
      const promise = _getRedirectResult(auth, resolver, true);
      iframeEvent({
        type: AuthEventType.LINK_VIA_REDIRECT
      });
      expect(await promise).to.eq(cred);
      expect(redirectPersistence._remove).not.to.have.been.called;
      expect(auth._currentUser?._redirectEventId).not.to.be.undefined;
      expect(auth.persistenceLayer.lastObjectSet?._redirectEventId).not.to.be
        .undefined;
    });
  });
});
