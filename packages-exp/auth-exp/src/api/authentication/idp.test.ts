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

import { FirebaseError } from '@firebase/util';

import { Endpoint, HttpHeader } from '../';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import { signInWithIdp } from './idp';

use(chaiAsPromised);

describe('api/authentication/signInWithIdp', () => {
  const request = {
    returnSecureToken: true,
    requestUri: 'request-uri',
    postBody: null
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_IDP, {
      displayName: 'my-name',
      idToken: 'id-token'
    });

    const response = await signInWithIdp(auth, request);
    expect(response.displayName).to.eq('my-name');
    expect(response.idToken).to.eq('id-token');
    expect(mock.calls[0].request).to.eql(request);
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
      Endpoint.SIGN_IN_WITH_IDP,
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

    await expect(signInWithIdp(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The supplied auth credential is malformed or has expired. (auth/invalid-credential).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
