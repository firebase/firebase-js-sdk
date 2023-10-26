/**
 * @license
 * Copyright 2023 Google LLC
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
import chaiAsPromised from 'chai-as-promised';

import { FirebaseError } from '@firebase/util';

import { Endpoint, HttpHeader } from '..';
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import {
  startPasskeyEnrollment,
  finalizePasskeyEnrollment,
  startPasskeySignIn,
  finalizePasskeySignIn,
  FinalizePasskeyEnrollmentRequest,
  FinalizePasskeySignInRequest
} from './passkey';

use(chaiAsPromised);

describe('api/account_management/startPasskeyEnrollment', () => {
  const request = {
    idToken: 'id-token',
    tenantId: 'tenant-id'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.START_PASSKEY_ENROLLMENT, {
      credentialCreationOptions: {}
    });

    const response = await startPasskeyEnrollment(auth, request);
    expect(response.credentialCreationOptions).to.eql({});
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
      Endpoint.START_PASSKEY_ENROLLMENT,
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

    await expect(startPasskeyEnrollment(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'auth/invalid-user-token'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/account_management/finalizeEnrollPasskey', () => {
  const decoder = new TextDecoder();
  const request: FinalizePasskeyEnrollmentRequest = {
    idToken: 'id-token',
    tenantId: 'tenant-id',
    authenticatorRegistrationResponse: {
      id: 'test-id',
      type: 'public-key',
      rawId: 'test-raw-id',
      response: {
        clientDataJSON: decoder.decode(new ArrayBuffer(16))
      }
    },
    name: 'test-name',
    displayName: 'test-display-name'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.FINALIZE_PASSKEY_ENROLLMENT, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    const response = await finalizePasskeyEnrollment(auth, request);
    expect(response.idToken).to.eq('id-token');
    expect(response.refreshToken).to.eq('refresh-token');
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
      Endpoint.FINALIZE_PASSKEY_ENROLLMENT,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_SESSION_INFO,
          errors: [
            {
              message: ServerError.INVALID_SESSION_INFO
            }
          ]
        }
      },
      400
    );

    await expect(finalizePasskeyEnrollment(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'auth/invalid-verification-id'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/startPasskeySignIn', () => {
  const request = {
    idToken: 'id-token',
    tenantId: 'tenant-id'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.START_PASSKEY_SIGNIN, {
      credentialRequestOptions: {}
    });

    const response = await startPasskeySignIn(auth, request);
    expect(response.credentialRequestOptions).to.eql({});
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
      Endpoint.START_PASSKEY_SIGNIN,
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

    await expect(startPasskeySignIn(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'auth/invalid-user-token'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/finalizePasskeySignIn', () => {
  const request: FinalizePasskeySignInRequest = {
    tenantId: 'tenant-id',
    authenticatorAuthenticationResponse: {
      id: 'test-id',
      rawId: 'test-raw-id',
      response: {
        authenticatorData: Buffer.from(new ArrayBuffer(16)).toString(),
        clientDataJSON: Buffer.from(new ArrayBuffer(16)).toString(),
        signature: Buffer.from(new ArrayBuffer(16)).toString(),
        userHandle: Buffer.from(new ArrayBuffer(16)).toString()
      },
      type: 'public-key'
    },
    name: 'test-name',
    displayName: 'test-display-name'
  };

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.FINALIZE_PASSKEY_SIGNIN, {
      idToken: 'id-token',
      refreshToken: 'refresh-token'
    });

    const response = await finalizePasskeySignIn(auth, request);
    expect(response.idToken).to.eq('id-token');
    expect(response.refreshToken).to.eq('refresh-token');
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
      Endpoint.FINALIZE_PASSKEY_SIGNIN,
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

    await expect(finalizePasskeySignIn(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'auth/invalid-user-token'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
