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
import { deleteAccount, deleteLinkedAccounts, getAccountInfo } from './account';

use(chaiAsPromised);

describe('deleteAccount', () => {
  const request = {
    idToken: 'id-token'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.DELETE_ACCOUNT, {});

    await deleteAccount(mockAuth, request);
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.DELETE_ACCOUNT,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_ID_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_ID_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(deleteAccount(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      "Firebase: This user's credential isn't valid for this project. This can happen if the user's token has been tampered with]: or if the user isn't for the project associated with this API key. (auth/invalid-user-token)."
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('deleteLinkedAccounts', () => {
  const request = {
    idToken: 'id-token',
    deleteProvider: [ProviderId.GOOGLE]
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {
      providerUserInfo: [
        {
          providerId: ProviderId.GOOGLE,
          email: 'test@foo.com'
        }
      ]
    });

    const response = await deleteLinkedAccounts(mockAuth, request);
    expect(response.providerUserInfo[0].providerId).to.eq('google.com');
    expect(response.providerUserInfo[0].email).to.eq('test@foo.com');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SET_ACCOUNT_INFO,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PROVIDER_ID,
          errors: [
            {
              message: ServerError.INVALID_PROVIDER_ID
            }
          ]
        }
      },
      400
    );

    await expect(deleteLinkedAccounts(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The specified provider ID is invalid. (auth/invalid-provider-id).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('getAccountInfo', () => {
  const request = {
    idToken: 'id-token'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [
        {
          displayName: 'my-name',
          email: 'test@foo.com'
        }
      ]
    });

    const response = await getAccountInfo(mockAuth, request);
    expect(response.users[0].displayName).to.eq('my-name');
    expect(response.users[0].email).to.eq('test@foo.com');
    expect(mock.calls[0].request).to.eql(request);
    expect(mock.calls[0].method).to.eq('POST');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.GET_ACCOUNT_INFO,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_ID_TOKEN,
          errors: [
            {
              message: ServerError.INVALID_ID_TOKEN
            }
          ]
        }
      },
      400
    );

    await expect(getAccountInfo(mockAuth, request)).to.be.rejectedWith(
      FirebaseError,
      "Firebase: This user's credential isn't valid for this project. This can happen if the user's token has been tampered with]: or if the user isn't for the project associated with this API key. (auth/invalid-user-token)."
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
