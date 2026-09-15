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

import { OperationType, ProviderId } from '../../model/enums';
import { FirebaseError } from '@firebase/util';

import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { authEvent, BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import {
  AuthEvent,
  AuthEventType,
  EventManager,
  PopupRedirectResolverInternal
} from '../../model/popup_redirect';
import { AuthEventManager } from '../auth/auth_event_manager';
import { AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _getInstance } from '../util/instantiator';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';
import * as idp from '../strategies/idp';
import { _createError } from '../util/assert';

vi.mock('../strategies/idp', { spy: true });
const ERROR = _createError(AuthErrorCode.INTERNAL_ERROR, {
  appName: 'test'
});

/**
 * A real class is needed to instantiate the action
 */
class WrapperOperation extends AbstractPopupRedirectOperation {
  eventId = '100';
  onExecution = vi.fn().mockReturnValue(Promise.resolve());
  cleanUp = vi.fn();
}

describe('core/strategies/abstract_popup_redirect_operation', () => {
  let auth: TestAuth;
  let resolver: PopupRedirectResolverInternal;
  let eventManager: EventManager;

  beforeEach(async () => {
    auth = await testAuth();
    eventManager = new AuthEventManager(auth);
    resolver = _getInstance(makeMockPopupRedirectResolver(eventManager));
    vi.spyOn(idp, '_signIn').mockResolvedValue(
      new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        _tokenResponse: { ...TEST_ID_TOKEN_RESPONSE },
        operationType: OperationType.SIGN_IN
      })
    );
    vi.spyOn(idp, '_link').mockResolvedValue(
      new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        _tokenResponse: { ...TEST_ID_TOKEN_RESPONSE },
        operationType: OperationType.LINK
      })
    );
    vi.spyOn(idp, '_reauth').mockResolvedValue(
      new UserCredentialImpl({
        user: testUser(auth, 'uid'),
        providerId: ProviderId.GOOGLE,
        _tokenResponse: { ...TEST_ID_TOKEN_RESPONSE },
        operationType: OperationType.REAUTHENTICATE
      })
    );
  });

  let finishTimeout: NodeJS.Timeout | null = null;

  afterEach(() => {
    if (finishTimeout) {
      clearTimeout(finishTimeout);
      finishTimeout = null;
    }
    vi.restoreAllMocks();
  });

  describe('#execute', () => {
    let operation: WrapperOperation;

    beforeEach(() => {
      operation = new WrapperOperation(
        auth,
        AuthEventType.LINK_VIA_POPUP,
        resolver
      );
    });

    /** Finishes out the promise */
    function finishPromise(outcome: AuthEvent | FirebaseError): void {
      if (finishTimeout) {
        clearTimeout(finishTimeout);
      }
      finishTimeout = setTimeout((): void => {
        if (outcome instanceof FirebaseError) {
          operation.onError(outcome);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          operation.onAuthEvent(outcome);
        }
      }, 5);
    }

    it('initializes the resolver', async () => {
      vi.spyOn(resolver, '_initialize');
      const promise = operation.execute();
      finishPromise(authEvent());
      await promise;
      expect(resolver._initialize).toHaveBeenCalledWith(auth);
    });

    it('calls subclass onExecution', async () => {
      finishPromise(authEvent());
      await operation.execute();
      expect(operation.onExecution).toHaveBeenCalled();
    });

    it('registers and unregisters itself with the event manager', async () => {
      vi.spyOn(eventManager, 'registerConsumer');
      vi.spyOn(eventManager, 'unregisterConsumer');
      finishPromise(authEvent());
      await operation.execute();
      expect(eventManager.registerConsumer).toHaveBeenCalledWith(operation);
      expect(eventManager.unregisterConsumer).toHaveBeenCalledWith(operation);
    });

    it('unregisters itself in case of error', async () => {
      vi.spyOn(eventManager, 'unregisterConsumer');
      finishPromise(ERROR);
      try {
        await operation.execute();
      } catch {}
      expect(eventManager.unregisterConsumer).toHaveBeenCalledWith(operation);
    });

    it('emits the user credential returned from idp task', async () => {
      finishPromise(authEvent());
      const cred = (await operation.execute())!;
      expect(cred.user.uid).toBe('uid');
      expect(cred._tokenResponse).toEqual(TEST_ID_TOKEN_RESPONSE);
      expect(cred.operationType).toBe(OperationType.SIGN_IN);
    });

    it('bubbles up any error', async () => {
      finishPromise(ERROR);
      await expect(operation.execute()).rejects.toBe(ERROR);
    });

    it('calls cleanUp on error', async () => {
      finishPromise(ERROR);
      try {
        await operation.execute();
      } catch {}
      expect(operation.cleanUp).toHaveBeenCalled();
    });

    it('calls cleanUp on success', async () => {
      finishPromise(authEvent());
      await operation.execute();
      expect(operation.cleanUp).toHaveBeenCalled();
    });

    describe('idp tasks', () => {
      function updateFilter(type: AuthEventType): void {
        (operation as unknown as Record<string, unknown>).filter = [type];
      }

      function expectedIdpTaskParams(): idp.IdpTaskParams {
        return {
          auth,
          requestUri: BASE_AUTH_EVENT.urlResponse!,
          sessionId: BASE_AUTH_EVENT.sessionId!,
          tenantId: BASE_AUTH_EVENT.tenantId || undefined,
          postBody: BASE_AUTH_EVENT.postBody || undefined,
          user: undefined,
          bypassAuthState: false
        };
      }

      it('routes SIGN_IN_VIA_POPUP', async () => {
        const type = AuthEventType.SIGN_IN_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._signIn).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('routes SIGN_IN_VIA_REDIRECT', async () => {
        const type = AuthEventType.SIGN_IN_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._signIn).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('routes LINK_VIA_POPUP', async () => {
        const type = AuthEventType.LINK_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._link).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('routes LINK_VIA_REDIRECT', async () => {
        const type = AuthEventType.LINK_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._link).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('routes REAUTH_VIA_POPUP', async () => {
        const type = AuthEventType.REAUTH_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._reauth).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('routes REAUTH_VIA_REDIRECT', async () => {
        const type = AuthEventType.REAUTH_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._reauth).toHaveBeenCalledWith(expectedIdpTaskParams());
      });

      it('includes the bypassAuthState parameter', async () => {
        operation = new WrapperOperation(
          auth,
          AuthEventType.REAUTH_VIA_REDIRECT,
          resolver,
          undefined,
          /** bypassAuthState */ true
        );

        const type = AuthEventType.REAUTH_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._reauth).toHaveBeenCalledWith({
          ...expectedIdpTaskParams(),
          bypassAuthState: true
        });
      });
    });
  });
});
