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

import { OperationType } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { delay } from '../../../test/delay';
import { authEvent, BASE_AUTH_EVENT } from '../../../test/iframe_event';
import { testAuth, testUser } from '../../../test/mock_auth';
import { makeMockPopupRedirectResolver } from '../../../test/mock_popup_redirect_resolver';
import { Auth } from '../../model/auth';
import {
    AuthEvent, AuthEventType, EventManager, PopupRedirectResolver
} from '../../model/popup_redirect';
import { AuthEventManager } from '../auth/auth_event_manager';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import { UserCredentialImpl } from '../user/user_credential_impl';
import { _getInstance } from '../util/instantiator';
import { AbstractPopupRedirectAction } from './abstract_popup_redirect_action';
import * as idp from './idp';

use(sinonChai);
use(chaiAsPromised);

const ERROR = AUTH_ERROR_FACTORY.create(AuthErrorCode.INTERNAL_ERROR, {
  appName: 'test'
});

/**
 * A real class is needed to instantiate the action
 */
class WrapperAction extends AbstractPopupRedirectAction {
  eventId = '100';
  onExecution = sinon.stub().returns(Promise.resolve());
  cleanUp = sinon.stub();
}

describe('src/core/strategies/abstract_popup_redirect_action', () => {
  let auth: Auth;
  let resolver: PopupRedirectResolver;
  let eventManager: EventManager;
  let idpStubs: sinon.SinonStubbedInstance<typeof idp>;

  beforeEach(async () => {
    auth = await testAuth();
    eventManager = new AuthEventManager(auth.name);
    resolver = _getInstance(makeMockPopupRedirectResolver(eventManager));
    idpStubs = sinon.stub(idp);
  });

  afterEach(() => {
    sinon.restore();
  });

  context('#execute', () => {
    let action: WrapperAction;
    
    beforeEach(() => {
      action = new WrapperAction(auth, AuthEventType.LINK_VIA_POPUP, resolver);
      idpStubs._signIn.returns(Promise.resolve(new UserCredentialImpl(testUser(auth, 'uid'), null, OperationType.SIGN_IN)));
    });

    /** Finishes out the promise */
    function finishPromise(outcome: AuthEvent|FirebaseError): void {
      delay((): void => {
        if (outcome instanceof FirebaseError) {
          action.onError(outcome);
        } else {
          // eslint-disable-next-line @typescript-eslint/no-floating-promises
          action.onAuthEvent(outcome);
        }
      });
    }

    it('initializes the resolver', async () => {
      sinon.spy(resolver, '_initialize');
      const promise = action.execute();
      finishPromise(authEvent());
      await promise;
      expect(resolver._initialize).to.have.been.calledWith(auth);
    });

    it('calls subclass onExecution', async () => {
      finishPromise(authEvent());
      await action.execute();
      expect(action.onExecution).to.have.been.called;
    });

    it('registers and unregisters itself with the event manager', async () => {
      sinon.spy(eventManager, 'registerConsumer');
      sinon.spy(eventManager, 'unregisterConsumer');
      finishPromise(authEvent());
      await action.execute();
      expect(eventManager.registerConsumer).to.have.been.calledWith(action);
      expect(eventManager.unregisterConsumer).to.have.been.calledWith(action);
    });

    it('unregisters itself in case of error', async () => {
      sinon.spy(eventManager, 'unregisterConsumer');
      finishPromise(ERROR);
      try { await action.execute(); } catch {}
      expect(eventManager.unregisterConsumer).to.have.been.calledWith(action);
    });

    it('emits the user credential returned from idp task', async () => {
      finishPromise(authEvent());
      const cred = await action.execute();
      expect(cred.user.uid).to.eq('uid');
      expect(cred.credential).to.be.null;
      expect(cred.operationType).to.eq(OperationType.SIGN_IN);
    });

    it('bubbles up any error', async (done) => {
      finishPromise(ERROR);
      try {
        await action.execute();
      } catch (e) {
        expect(e).to.eq(ERROR);
        done();
      }
    });

    context('idp tasks', () => {
      function updateFilter(type: AuthEventType) {
        (action as unknown as Record<string, unknown>).filter = type;
      }

      const expectedIdpTaskParams: idp.IdpTaskParams = {
        auth,
        requestUri: BASE_AUTH_EVENT.urlResponse!,
        sessionId: BASE_AUTH_EVENT.sessionId!,
        tenantId: BASE_AUTH_EVENT.tenantId || undefined,
        postBody: BASE_AUTH_EVENT.postBody || undefined,
      };

      it('routes signInWithPopup', async () => {
        const type = AuthEventType.SIGN_IN_VIA_POPUP;
        updateFilter(type);
        finishPromise(authEvent({type}));
        await action.execute();
        expect(idp._signIn).to.have.been.calledWith(expectedIdpTaskParams);
      });
    });
  });
});