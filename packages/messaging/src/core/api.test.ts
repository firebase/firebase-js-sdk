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

import '../testing/setup';

import {
  ApiRequestBody,
  requestDeleteToken,
  requestGetToken,
  requestUpdateToken
} from './api';

import { ENDPOINT } from '../util/constants';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { Stub } from '../testing/sinon-types';
import { TokenDetails } from '../interfaces/token-details';
import { compareHeaders } from '../testing/compare-headers';
import { expect } from 'chai';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { stub } from 'sinon';

describe('API', () => {
  let tokenDetails: TokenDetails;
  let firebaseDependencies: FirebaseInternalDependencies;
  let fetchStub: Stub<typeof fetch>;

  beforeEach(() => {
    tokenDetails = getFakeTokenDetails();
    firebaseDependencies = getFakeFirebaseDependencies();
    fetchStub = stub(self, 'fetch');
  });

  describe('getToken', () => {
    it('calls the createRegistration server API with correct parameters', async () => {
      fetchStub.resolves(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      const response = await requestGetToken(
        firebaseDependencies,
        tokenDetails.subscriptionOptions!
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedBody: ApiRequestBody = {
        web: {
          endpoint: 'https://example.org',
          auth: 'YXV0aC12YWx1ZQ',
          p256dh: 'cDI1Ni12YWx1ZQ',
          applicationPubKey: 'dmFwaWQta2V5LXZhbHVl'
        }
      };
      const expectedRequest: RequestInit = {
        method: 'POST',
        headers: expectedHeaders,
        body: JSON.stringify(expectedBody)
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations`;

      expect(response).to.equal('fcm-token-from-server');
      expect(fetchStub).to.be.calledOnceWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchStub.lastCall.lastArg.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('throws if there is a problem with the response', async () => {
      fetchStub.rejects(new Error('Fetch failed'));
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).to.be.rejectedWith('Fetch failed');

      fetchStub.resolves(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).to.be.rejectedWith('messaging/token-subscribe-failed');

      fetchStub.resolves(
        new Response(
          JSON.stringify({
            /* no token */
          })
        )
      );
      await expect(
        requestGetToken(firebaseDependencies, tokenDetails.subscriptionOptions!)
      ).to.be.rejectedWith('messaging/token-subscribe-no-token');
    });
  });

  describe('updateToken', () => {
    it('calls the updateRegistration server API with correct parameters', async () => {
      fetchStub.resolves(
        new Response(JSON.stringify({ token: 'fcm-token-from-server' }))
      );

      const response = await requestUpdateToken(
        firebaseDependencies,
        tokenDetails
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedBody: ApiRequestBody = {
        web: {
          endpoint: 'https://example.org',
          auth: 'YXV0aC12YWx1ZQ',
          p256dh: 'cDI1Ni12YWx1ZQ',
          applicationPubKey: 'dmFwaWQta2V5LXZhbHVl'
        }
      };
      const expectedRequest: RequestInit = {
        method: 'PATCH',
        headers: expectedHeaders,
        body: JSON.stringify(expectedBody)
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations/token-value`;

      expect(response).to.equal('fcm-token-from-server');
      expect(fetchStub).to.be.calledOnceWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchStub.lastCall.lastArg.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('throws if there is a problem with the response', async () => {
      fetchStub.rejects(new Error('Fetch failed'));
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).to.be.rejectedWith('Fetch failed');

      fetchStub.resolves(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).to.be.rejectedWith('messaging/token-update-failed');

      fetchStub.resolves(
        new Response(
          JSON.stringify({
            /* no token */
          })
        )
      );
      await expect(
        requestUpdateToken(firebaseDependencies, tokenDetails)
      ).to.be.rejectedWith('messaging/token-update-no-token');
    });
  });

  describe('deleteToken', () => {
    it('calls the deleteRegistration server API with correct parameters', async () => {
      fetchStub.resolves(new Response(JSON.stringify({})));

      const response = await requestDeleteToken(
        firebaseDependencies,
        tokenDetails.token
      );

      const expectedHeaders = new Headers({
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-goog-api-key': 'apiKey',
        'x-goog-firebase-installations-auth': `FIS authToken`
      });
      const expectedRequest: RequestInit = {
        method: 'DELETE',
        headers: expectedHeaders
      };
      const expectedEndpoint = `${ENDPOINT}/projects/projectId/registrations/token-value`;

      expect(response).to.be.undefined;
      expect(fetchStub).to.be.calledOnceWith(expectedEndpoint, expectedRequest);
      const actualHeaders = fetchStub.lastCall.lastArg.headers;
      compareHeaders(expectedHeaders, actualHeaders);
    });

    it('throws if there is a problem with the response', async () => {
      fetchStub.rejects(new Error('Fetch failed'));
      await expect(
        requestDeleteToken(firebaseDependencies, tokenDetails.token)
      ).to.be.rejectedWith('Fetch failed');

      fetchStub.resolves(
        new Response(JSON.stringify({ error: { message: 'error message' } }))
      );
      await expect(
        requestDeleteToken(firebaseDependencies, tokenDetails.token)
      ).to.be.rejectedWith('messaging/token-unsubscribe-failed');
    });
  });
});
