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

import { OperationType, ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { delay } from '../../../test/helpers/delay';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { authEvent, BASE_AUTH_EVENT } from '../../../test/helpers/iframe_event';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/helpers/mock_popup_redirect_resolver';
import {
  AuthEvent,
  AuthEventType,
  EventManager,
  PopupRedirectResolver
} from '../../model/popup_redirect';
import { AuthEventManager } from '../../core/auth/auth_event_manager';
import { AuthErrorCode } from '../../core/errors';
import { UserCredentialImpl } from '../../core/user/user_credential_impl';
import { _getInstance } from '../../core/util/instantiator';
import { AbstractPopupRedirectOperation } from './abstract_popup_redirect_operation';
import * as idp from '../../core/strategies/idp';
import { _createError } from '../../core/util/assert';

use(sinonChai);
use(chaiAsPromised);

const ERROR = _createError(AuthErrorCode.INTERNAL_ERROR, {
  appName: 'test'
});

/**
 * A real class is needed to instantiate the action
 */
class WrapperOperation extends AbstractPopupRedirectOperation {
  eventId = '100';
  onExecution = sinon.stub().returns(Promise.resolve());
  cleanUp = sinon.stub();
}

describe('platform_browser/strategies/abstract_popup_redirect_operation', () => {
  let auth: TestAuth;
  let resolver: PopupRedirectResolver;
  let eventManager: EventManager;
  let idpStubs: sinon.SinonStubbedInstance<typeof idp>;

  beforeEach(async () => {
    auth = await testAuth();
    eventManager = new AuthEventManager(auth);
    resolver = _getInstance(makeMockPopupRedirectResolver(eventManager));
    idpStubs = sinon.stub(idp);
  });

  afterEach(() => {
    sinon.restore();
  });

  context('#execute', () => {
    let operation: WrapperOperation;

    beforeEach(() => {
      operation = new WrapperOperation(
        auth,
        AuthEventType.LINK_VIA_POPUP,
        resolver
      );
      idpStubs._signIn.returns(
        Promise.resolve(
          new UserCredentialImpl({
            user: testUser(auth, 'uid'),
            providerId: ProviderId.GOOGLE,
            _tokenResponse: { ...TEST_ID_TOKEN_RESPONSE },
            operationType: OperationType.SIGN_IN
          })
        )
      );
    });

    /** Finishes out the promise */
    function finishPromise(outcome: AuthEvent | FirebaseError): void {
      delay((): void => {
        if (outcome instanceof FirebaseError) {
          operation.onError(outcome);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          operation.onAuthEvent(outcome);
        }
      });
    }

    it('initializes the resolver', async () => {
      sinon.spy(resolver, '_initialize');
      const promise = operation.execute();
      finishPromise(authEvent());
      await promise;
      expect(resolver._initialize).to.have.been.calledWith(auth);
    });

    it('calls subclass onExecution', async () => {
      finishPromise(authEvent());
      await operation.execute();
      expect(operation.onExecution).to.have.been.called;
    });

    it('registers and unregisters itself with the event manager', async () => {
      sinon.spy(eventManager, 'registerConsumer');
      sinon.spy(eventManager, 'unregisterConsumer');
      finishPromise(authEvent());
      await operation.execute();
      expect(eventManager.registerConsumer).to.have.been.calledWith(operation);
      expect(eventManager.unregisterConsumer).to.have.been.calledWith(
        operation
      );
    });

    it('unregisters itself in case of error', async () => {
      sinon.spy(eventManager, 'unregisterConsumer');
      finishPromise(ERROR);
      try {
        await operation.execute();
      } catch {}
      expect(eventManager.unregisterConsumer).to.have.been.calledWith(
        operation
      );
    });

    it('emits the user credential returned from idp task', async () => {
      finishPromise(authEvent());
      const cred = (await operation.execute())!;
      expect(cred.user.uid).to.eq('uid');
      expect(cred._tokenResponse).to.eql(TEST_ID_TOKEN_RESPONSE);
      expect(cred.operationType).to.eq(OperationType.SIGN_IN);
    });

    it('bubbles up any error', done => {
      finishPromise(ERROR);
      operation.execute().catch(e => {
        expect(e).to.eq(ERROR);
        done();
      });
    });

    it('calls cleanUp on error', async () => {
      finishPromise(ERROR);
      try {
        await operation.execute();
      } catch {}
      expect(operation.cleanUp).to.have.been.called;
    });

    it('calls cleanUp on success', async () => {
      finishPromise(authEvent());
      await operation.execute();
      expect(operation.cleanUp).to.have.been.called;
    });

    context('idp tasks', () => {
      function updateFilter(type: AuthEventType): void {
        ((operation as unknown) as Record<string, unknown>).filter = type;
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
        expect(idp._signIn).to.have.been.calledWith(expectedIdpTaskParams());
      });

      it('routes SIGN_IN_VIA_REDIRECT', async () => {
        const type = AuthEventType.SIGN_IN_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._signIn).to.have.been.calledWith(expectedIdpTaskParams());
      });

      it('routes LINK_VIA_POPUP', async () => {
        const type = AuthEventType.LINK_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._link).to.have.been.calledWith(expectedIdpTaskParams());
      });

      it('routes LINK_VIA_REDIRECT', async () => {
        const type = AuthEventType.LINK_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._link).to.have.been.calledWith(expectedIdpTaskParams());
      });

      it('routes REAUTH_VIA_POPUP', async () => {
        const type = AuthEventType.REAUTH_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._reauth).to.have.been.calledWith(expectedIdpTaskParams());
      });

      it('routes REAUTH_VIA_REDIRECT', async () => {
        const type = AuthEventType.REAUTH_VIA_REDIRECT;
        updateFilter(type);
        finishPromise(authEvent({ type }));
        await operation.execute();
        expect(idp._reauth).to.have.been.calledWith(expectedIdpTaskParams());
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
        expect(idp._reauth).to.have.been.calledWith({
          ...expectedIdpTaskParams(),
          bypassAuthState: true
        });
      });
    });
  });
});
