/**
 * @license
 * Copyright 2019 Google LLC
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

import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import { OperationType } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/helpers/id_token_response';
import { makeJWT } from '../../../test/helpers/jwt';
import { testAuth, testUser, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { User } from '../../model/user';
import * as reauthenticate from '../../core/user/reauthenticate';
import * as linkUnlink from '../../core/user/link_unlink';
import * as credential from '../../core/strategies/credential';

import * as idpTasks from './idp';
import { UserCredentialImpl } from '../user/user_credential_impl';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/idb', () => {
  let auth: TestAuth;
  let user: User;
  let signInEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', 'email', true);

    fetch.setUp();

    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [{ localId: 'uid' }]
    });

    signInEndpoint = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, {
      ...TEST_ID_TOKEN_RESPONSE,
      idToken: makeJWT({ sub: 'uid' })
    });
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  describe('signIn', () => {
    it('builds a request and calls the endpoint', async () => {
      await idpTasks._signIn({
        auth,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true
      });
    });

    it('returns a user credential with the signed in user', async () => {
      const userCred = await idpTasks._signIn({
        auth,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCred.user.uid).to.eq('uid');
    });

    it('passes through the bypassAuthState flag', async () => {
      const stub = sinon.stub(credential, '_signInWithCredential').returns(Promise.resolve({} as unknown  as UserCredentialImpl));
      await idpTasks._signIn({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
        bypassAuthState: true,
      });
      expect(stub.getCall(0).lastArg).to.be.true;
    });
  });

  describe('reauth', () => {
    it('builds a request and calls the endpoint', async () => {
      await idpTasks._reauth({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true
      });
    });

    it('returns a user credential with the reauthed in user', async () => {
      const userCred = await idpTasks._reauth({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(userCred.operationType).to.eq(OperationType.REAUTHENTICATE);
      expect(userCred.user.uid).to.eq('uid');
    });

    it('passes through the bypassAuthState flag', async () => {
      const stub = sinon.stub(reauthenticate, '_reauthenticate').returns(Promise.resolve({} as unknown  as UserCredentialImpl));
      await idpTasks._reauth({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
        bypassAuthState: true,
      });
      expect(stub.getCall(0).lastArg).to.be.true;
    });
  });

  describe('link', () => {
    it('builds a request and calls the endpoint', async () => {
      const idTokenBeforeLink = await user.getIdToken();
      await idpTasks._link({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true,
        idToken: idTokenBeforeLink
      });
    });

    it('returns a user credential with the reauthed in user', async () => {
      const userCred = await idpTasks._link({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body'
      });

      expect(userCred.operationType).to.eq(OperationType.LINK);
      expect(userCred.user.uid).to.eq('uid');
    });

    it('passes through the bypassAuthState flag', async () => {
      const stub = sinon.stub(linkUnlink, '_link').returns(Promise.resolve({} as unknown  as UserCredentialImpl));
      await idpTasks._link({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
        bypassAuthState: true,
      });
      expect(stub.getCall(0).lastArg).to.be.true;
    });
  });
});
