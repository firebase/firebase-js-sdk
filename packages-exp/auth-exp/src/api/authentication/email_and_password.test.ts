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
import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Auth } from '../../model/auth';
import { ServerError } from '../errors';
import {
  EmailSignInRequest,
  PasswordResetRequest,
  sendEmailVerification,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithPassword,
  VerifyEmailRequest,
  verifyAndChangeEmail,
  VerifyAndChangeEmailRequest
} from './email_and_password';
import { Operation } from '@firebase/auth-types-exp';

use(chaiAsPromised);

describe('api/authentication/signInWithPassword', () => {
  const request = {
    returnSecureToken: true,
    email: 'test@foo.com',
    password: 'my-password'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_PASSWORD, {
      displayName: 'my-name',
      email: 'test@foo.com'
    });

    const response = await signInWithPassword(auth, request);
    expect(response.displayName).to.eq('my-name');
    expect(response.email).to.eq('test@foo.com');
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
      Endpoint.SIGN_IN_WITH_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_PASSWORD,
          errors: [
            {
              message: ServerError.INVALID_PASSWORD
            }
          ]
        }
      },
      400
    );

    await expect(signInWithPassword(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The password is invalid or the user does not have a password. (auth/wrong-password).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/sendEmailVerification', () => {
  const request: VerifyEmailRequest = {
    requestType: Operation.VERIFY_EMAIL,
    idToken: 'my-token'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email: 'test@foo.com'
    });

    const response = await sendEmailVerification(auth, request);
    expect(response.email).to.eq('test@foo.com');
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
      Endpoint.SEND_OOB_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL,
          errors: [
            {
              message: ServerError.INVALID_EMAIL
            }
          ]
        }
      },
      400
    );

    await expect(sendEmailVerification(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/sendPasswordResetEmail', () => {
  const request: PasswordResetRequest = {
    requestType: Operation.PASSWORD_RESET,
    email: 'test@foo.com'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email: 'test@foo.com'
    });

    const response = await sendPasswordResetEmail(auth, request);
    expect(response.email).to.eq('test@foo.com');
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
      Endpoint.SEND_OOB_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL,
          errors: [
            {
              message: ServerError.INVALID_EMAIL
            }
          ]
        }
      },
      400
    );

    await expect(sendPasswordResetEmail(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/sendSignInLinkToEmail', () => {
  const request: EmailSignInRequest = {
    requestType: Operation.EMAIL_SIGNIN,
    email: 'test@foo.com'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email: 'test@foo.com'
    });

    const response = await sendSignInLinkToEmail(auth, request);
    expect(response.email).to.eq('test@foo.com');
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
      Endpoint.SEND_OOB_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL,
          errors: [
            {
              message: ServerError.INVALID_EMAIL
            }
          ]
        }
      },
      400
    );

    await expect(sendSignInLinkToEmail(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});

describe('api/authentication/verifyAndChangeEmail', () => {
  const request: VerifyAndChangeEmailRequest = {
    requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
    idToken: 'id-token',
    newEmail: 'test@foo.com'
  };

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email: 'test@foo.com'
    });

    const response = await verifyAndChangeEmail(auth, request);
    expect(response.email).to.eq('test@foo.com');
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
      Endpoint.SEND_OOB_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL,
          errors: [
            {
              message: ServerError.INVALID_EMAIL
            }
          ]
        }
      },
      400
    );

    await expect(verifyAndChangeEmail(auth, request)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls[0].request).to.eql(request);
  });
});
