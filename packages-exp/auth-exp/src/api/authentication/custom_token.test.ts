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

import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { Endpoint } from '..';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { ProviderId } from '../../core/providers';
import { ServerError } from '../errors';
import { signInWithCustomToken } from './custom_token';

use(chaiAsPromised);

describe('signInWithCustomToken', () => {
  const request = {
    token: 'my-token'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN, {
      providerId: ProviderId.CUSTOM,
      idToken: 'id-token',
      expiresIn: '1000',
      localId: '1234'
    });

    const response = await signInWithCustomToken(mockAuth, request);
    expect(response.providerId).to.eq(ProviderId.CUSTOM);
    expect(response.idToken).to.eq('id-token');
    expect(response.expiresIn).to.eq('1000');
    expect(response.localId).to.eq('1234');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SIGN_IN_WITH_CUSTOM_TOKEN,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_CUSTOM_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_CUSTOM_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(signInWithCustomToken(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The custom token format is incorrect. Please check the documentation. (auth/invalid-custom-token).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
