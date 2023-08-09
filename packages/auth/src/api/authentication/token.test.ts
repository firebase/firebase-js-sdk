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

import * as sinon from 'sinon';
import { expect, use } from 'chai';
import chaiAsPromised from 'chai-as-promised';

import { FirebaseError, getUA, querystringDecode } from '@firebase/util';

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as fetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { TokenType, requestStsToken, revokeToken } from './token';
import { SDK_VERSION } from '@firebase/app';
import { _getBrowserName } from '../../core/util/browser';

use(chaiAsPromised);

describe('requestStsToken', () => {
  let auth: TestAuth;
  let endpoint: string;

  beforeEach(async () => {
    auth = await testAuth();
    const { apiKey, tokenApiHost, apiScheme } = auth.config;
    endpoint = `${apiScheme}://${tokenApiHost}${Endpoint.TOKEN}?key=${apiKey}`;
    fetch.setUp();
  });

  afterEach(() => {
    fetch.tearDown();
    sinon.restore();
  });

  it('should POST to the correct endpoint', async () => {
    const mock = fetch.mock(endpoint, {
      'access_token': 'new-access-token',
      'expires_in': '3600',
      'refresh_token': 'new-refresh-token'
    });

    const response = await requestStsToken(auth, 'old-refresh-token');
    expect(response.accessToken).to.eq('new-access-token');
    expect(response.expiresIn).to.eq('3600');
    expect(response.refreshToken).to.eq('new-refresh-token');
    const request = querystringDecode(`?${mock.calls[0].request}`);
    expect(request).to.eql({
      'grant_type': 'refresh_token',
      'refresh_token': 'old-refresh-token'
    });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/x-www-form-urlencoded'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should set the framework in clientVersion if logged', async () => {
    const mock = fetch.mock(endpoint, {
      'access_token': 'new-access-token',
      'expires_in': '3600',
      'refresh_token': 'new-refresh-token'
    });

    auth._logFramework('Mythical');
    await requestStsToken(auth, 'old-refresh-token');
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      `${_getBrowserName(getUA())}/JsCore/${SDK_VERSION}/Mythical`
    );

    // If a new framework is logged, the client version header should change as well.
    auth._logFramework('Magical');
    await requestStsToken(auth, 'old-refresh-token');
    expect(mock.calls[1].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      // frameworks should be sorted alphabetically
      `${_getBrowserName(getUA())}/JsCore/${SDK_VERSION}/Magical,Mythical`
    );
  });

  it('should include whatever headers come from auth impl', async () => {
    sinon.stub(auth, '_getAdditionalHeaders').returns(
      Promise.resolve({
        'look-at-me-im-a-header': 'header-value',
        'anotherheader': 'header-value-2'
      })
    );

    const mock = fetch.mock(endpoint, {
      'access_token': 'new-access-token',
      'expires_in': '3600',
      'refresh_token': 'new-refresh-token'
    });
    await requestStsToken(auth, 'old-refresh-token');

    expect(mock.calls[0].headers.get('look-at-me-im-a-header')).to.eq(
      'header-value'
    );
    expect(mock.calls[0].headers.get('anotherheader')).to.eq('header-value-2');
  });

  it('should handle errors', async () => {
    const mock = fetch.mock(
      endpoint,
      {
        error: {
          code: 400,
          message: ServerError.TOKEN_EXPIRED,
          errors: [
            {
              message: ServerError.TOKEN_EXPIRED
            }
          ]
        }
      },
      400
    );

    await expect(requestStsToken(auth, 'old-token')).to.be.rejectedWith(
      FirebaseError,
      "Firebase: The user's credential is no longer valid. The user must sign in again. (auth/user-token-expired)"
    );
    const request = querystringDecode(`?${mock.calls[0].request}`);
    expect(request).to.eql({
      'grant_type': 'refresh_token',
      'refresh_token': 'old-token'
    });
  });
});

describe('api/authentication/revokeToken', () => {
  const request = {
    providerId: 'provider-id',
    tokenType: TokenType.ACCESS_TOKEN,
    token: 'token',
    idToken: 'id-token'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    fetch.setUp();
  });

  afterEach(() => {
    fetch.tearDown();
  });

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.REVOKE_TOKEN, {});

    auth.tenantId = 'tenant-id';
    await revokeToken(auth, request);
    // Currently, backend returns an empty response.
    expect(mock.calls[0].request).to.eql({ ...request, tenantId: 'tenant-id' });
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers!.get(HttpHeader.CONTENT_TYPE)).to.eq(
      'application/json'
    );
    expect(mock.calls[0].headers!.get(HttpHeader.X_CLIENT_VERSION)).to.eq(
      'testSDK/0.0.0'
    );
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.REVOKE_TOKEN,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_IDP_RESPONSE,
          errors: [
            {
              message: ServerError.INVALID_IDP_RESPONSE
            }
          ]
        }
      },
      400
    );

    await expect(revokeToken(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied auth credential is malformed or has expired. (auth/invalid-credential).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
