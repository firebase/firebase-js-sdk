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

import {
  AuthError,
  Persistence,
  PopupRedirectResolver
} from '../../model/public_types';
import { OperationType, ProviderId } from '../../model/enums';
import { _clearInstanceMap, _getInstance } from '../util/instantiator';
import {
  MockPersistenceLayer,
  TestAuth,
  testAuth,
  testUser
} from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import { AuthInternal } from '../../model/auth';
import { AuthEventManager } from '../auth/auth_event_manager';
import {
  RedirectAction,
  _clearRedirectOutcomes,
  _getAndClearPendingRedirectStatus
} from './redirect';
import {
  AuthEvent,
  AuthEventType,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { UserCredentialImpl } from '../user/user_credential_impl';
import * as idpTasks from '../strategies/idp';
import { AuthErrorCode } from '../errors';
import { RedirectPersistence } from '../../../test/helpers/redirect_persistence';
import { ErroringUnavailablePersistence } from '../../../test/helpers/erroring_unavailable_persistence';

vi.mock('../strategies/idp', { spy: true });

const MATCHING_EVENT_ID = 'matching-event-id';
const OTHER_EVENT_ID = 'wrong-id';

describe('core/strategies/redirect', () => {
  let auth: AuthInternal;
  let redirectAction: RedirectAction;
  let eventManager: AuthEventManager;
  let resolver: PopupRedirectResolver;
  let redirectPersistence: RedirectPersistence;

  beforeEach(async () => {
    vi.clearAllMocks();
    eventManager = new AuthEventManager({} as unknown as TestAuth);
    resolver = makeMockPopupRedirectResolver(eventManager);
    _getInstance<PopupRedirectResolverInternal>(resolver)._redirectPersistence =
      RedirectPersistence;
    auth = await testAuth();
    redirectAction = new RedirectAction(auth, _getInstance(resolver), false);
    redirectPersistence = _getInstance(RedirectPersistence);

    // Default to has redirect for most test
    redirectPersistence.hasPendingRedirect = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    _clearRedirectOutcomes();
    _clearInstanceMap();
  });

  function iframeEvent(event: Partial<AuthEvent>): void {
    // Push the dispatch out of the synchronous flow
    setTimeout(() => {
      eventManager.onEvent({
        ...BASE_AUTH_EVENT,
        eventId: MATCHING_EVENT_ID,
        ...event
      });
    }, 1);
  }

  async function reInitAuthWithRedirectUser(eventId: string): Promise<void> {
    const mainPersistence = new MockPersistenceLayer();
    const oldAuth = await testAuth();
    const user = testUser(oldAuth, 'uid');
    user._redirectEventId = eventId;
    redirectPersistence.redirectUser = user.toJSON();
    vi.spyOn(mainPersistence, '_get').mockReturnValue(
      Promise.resolve(user.toJSON())
    );

    auth = await testAuth(resolver, mainPersistence);
    redirectAction = new RedirectAction(auth, _getInstance(resolver), true);
  }

  it('completes with the cred', async () => {
    const cred = new UserCredentialImpl({
      user: testUser(auth, 'uid'),
      providerId: ProviderId.GOOGLE,
      operationType: OperationType.SIGN_IN
    });
    vi.spyOn(idpTasks, '_signIn').mockResolvedValue(cred);
    const promise = redirectAction.execute();
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
    vi.spyOn(idpTasks, '_signIn').mockResolvedValue(cred);
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.SIGN_IN_VIA_REDIRECT
    });
    expect(await promise).toBe(cred);
    expect(await redirectAction.execute()).toBeNull();
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
    vi.spyOn(idpTasks, '_link').mockResolvedValue(cred);
    const promise = redirectAction.execute();
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
    vi.spyOn(idpTasks, '_link').mockResolvedValue(cred);
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.LINK_VIA_REDIRECT
    });
    expect(await promise).toBeNull();
  });

  it('returns null if there is no pending redirect', async () => {
    const promise = redirectAction.execute();
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
    vi.spyOn(idpTasks, '_reauth').mockResolvedValue(cred);
    const promise = redirectAction.execute();
    iframeEvent({
      type: AuthEventType.REAUTH_VIA_REDIRECT
    });
    expect(await promise).toBe(cred);

    // In this case, bypassAuthState is true... The value won't be cleared
    expect(await redirectAction.execute()).toBe(cred);
  });

  it('bypasses initialization if no key set', async () => {
    await reInitAuthWithRedirectUser(MATCHING_EVENT_ID);
    const resolverInstance =
      _getInstance<PopupRedirectResolverInternal>(resolver);

    vi.spyOn(resolverInstance, '_initialize');
    redirectPersistence.hasPendingRedirect = false;

    expect(await redirectAction.execute()).toBe(null);
    expect(await redirectAction.execute()).toBe(null);
    expect(resolverInstance._initialize).not.toHaveBeenCalled();
  });

  (typeof window === 'undefined' ? describe.skip : describe)(
    '_getAndClearPendingRedirectStatus',
    () => {
      it('returns false if the key is not set', async () => {
        redirectPersistence.hasPendingRedirect = false;
        expect(
          await _getAndClearPendingRedirectStatus(_getInstance(resolver), auth)
        ).toBe(false);
      });

      it('returns true if the key is found', async () => {
        redirectPersistence.hasPendingRedirect = true;
        expect(
          await _getAndClearPendingRedirectStatus(_getInstance(resolver), auth)
        ).toBe(true);
      });

      it('returns false if sessionStorage is permission denied', async () => {
        _getInstance<PopupRedirectResolverInternal>(
          resolver
        )._redirectPersistence =
          ErroringUnavailablePersistence as unknown as Persistence;
        expect(
          await _getAndClearPendingRedirectStatus(_getInstance(resolver), auth)
        ).toBe(false);
      });
    }
  );
});
