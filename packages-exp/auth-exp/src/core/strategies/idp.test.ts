/**
 * @license
 * Copyright 2019 Google Inc.
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

import { OperationType } from '@firebase/auth-types-exp';

import { mockEndpoint } from '../../../test/api/helper';
import { TEST_ID_TOKEN_RESPONSE } from '../../../test/id_token_response';
import { makeJWT } from '../../../test/jwt';
import { testAuth, testUser } from '../../../test/mock_auth';
import * as fetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { Auth } from '../../model/auth';
import { User } from '../../model/user';
import * as idpTasks from './idp';

use(chaiAsPromised);

describe('src/core/strategies/idb', () => {
  let auth: Auth;
  let user: User;
  let signInEndpoint: fetch.Route;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'uid', 'email', true);

    fetch.setUp();

    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [
        {localId: 'uid'}
      ]
    });

    signInEndpoint = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, {
      ...TEST_ID_TOKEN_RESPONSE,
      idToken: makeJWT({sub: 'uid'})
    });
  });

  afterEach(() => {
    fetch.tearDown();
  });

  describe('signIn', () => {
    it('builds a request and calls the endpoint', async () => {
      await idpTasks._signIn({
        auth,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true,
      });
    });

    it('returns a user credential with the signed in user', async () => {
      const userCred= await idpTasks._signIn({
        auth,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
      });

      expect(userCred.operationType).to.eq(OperationType.SIGN_IN);
      expect(userCred.user.uid).to.eq('uid');
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
        postBody: 'post-body',
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true,
      });
    });

    it('returns a user credential with the reauthed in user', async () => {
      const userCred= await idpTasks._reauth({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
      });

      expect(userCred.operationType).to.eq(OperationType.REAUTHENTICATE);
      expect(userCred.user.uid).to.eq('uid');
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
        postBody: 'post-body',
      });

      expect(signInEndpoint.calls[0].request).to.eql({
        requestUri: 'request-uri',
        sessionId: 'session-id',
        postBody: 'post-body',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        returnSecureToken: true,
        idToken: idTokenBeforeLink,
      });
    });

    it('returns a user credential with the reauthed in user', async () => {
      const userCred= await idpTasks._link({
        auth,
        user,
        requestUri: 'request-uri',
        sessionId: 'session-id',
        tenantId: 'tenant-id',
        pendingToken: 'pending-token',
        postBody: 'post-body',
      });

      expect(userCred.operationType).to.eq(OperationType.LINK);
      expect(userCred.user.uid).to.eq('uid');
    });
  });
});