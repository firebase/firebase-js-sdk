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
import * as sinonChai from 'sinon-chai';

import {
  Operation,
  OperationType,
  ProviderId,
  SignInMethod
} from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { ServerError } from '../../api/errors';
import { Auth } from '../../model/auth';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  verifyPasswordResetCode
} from './email_and_password';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/sendPasswordResetEmail', () => {
  const email = 'foo@bar.com';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should send a password reset email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email
    });
    await sendPasswordResetEmail(auth, email);
    expect(mock.calls[0].request).to.eql({
      requestType: Operation.PASSWORD_RESET,
      email
    });
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SEND_OOB_CODE,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL
        }
      },
      400
    );
    await expect(sendPasswordResetEmail(auth, email)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls.length).to.eq(1);
  });

  context('on iOS', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email
      });
      await sendPasswordResetEmail(auth, email, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle',
          appStoreId: 'my-appstore-id'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: Operation.PASSWORD_RESET,
        email,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        canHandleCodeInApp: true,
        iosBundleId: 'my-bundle',
        iosAppStoreId: 'my-appstore-id'
      });
    });
  });

  context('on Android', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email
      });
      await sendPasswordResetEmail(auth, email, {
        handleCodeInApp: true,
        android: {
          installApp: false,
          minimumVersion: 'my-version',
          packageName: 'my-package'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });
      expect(mock.calls[0].request).to.eql({
        requestType: Operation.PASSWORD_RESET,
        email,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        canHandleCodeInApp: true,
        androidInstallApp: false,
        androidMinimumVersionCode: 'my-version',
        androidPackageName: 'my-package'
      });
    });
  });
});

describe('core/strategies/confirmPasswordReset', () => {
  const oobCode = 'oob-code';
  const newPassword = 'new-password';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should confirm the password reset and not return the email', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email: 'foo@bar.com'
    });
    const response = await confirmPasswordReset(auth, oobCode, newPassword);
    expect(response).to.be.undefined;
    expect(mock.calls[0].request).to.eql({
      oobCode,
      newPassword
    });
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.RESET_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_OOB_CODE
        }
      },
      400
    );
    await expect(
      confirmPasswordReset(auth, oobCode, newPassword)
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/applyActionCode', () => {
  const oobCode = 'oob-code';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should apply the oob code', async () => {
    const mock = mockEndpoint(Endpoint.SET_ACCOUNT_INFO, {});
    await applyActionCode(auth, oobCode);
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.SET_ACCOUNT_INFO,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_OOB_CODE
        }
      },
      400
    );
    await expect(applyActionCode(auth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/checkActionCode', () => {
  const oobCode = 'oob-code';
  const email = 'foo@bar.com';
  const newEmail = 'new@email.com';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: Operation.PASSWORD_RESET,
      email: 'foo@bar.com'
    });
    const response = await checkActionCode(auth, oobCode);
    expect(response).to.eql({
      data: {
        email,
        previousEmail: null,
        multiFactorInfo: null
      },
      operation: Operation.PASSWORD_RESET
    });
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should return the newEmail', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: Operation.PASSWORD_RESET,
      email,
      newEmail
    });
    const response = await checkActionCode(auth, oobCode);
    expect(response).to.eql({
      data: {
        email,
        previousEmail: newEmail,
        multiFactorInfo: null
      },
      operation: Operation.PASSWORD_RESET
    });
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should expect a requestType', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email
    });
    await expect(checkActionCode(auth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
    expect(mock.calls.length).to.eq(1);
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.RESET_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_OOB_CODE
        }
      },
      400
    );
    await expect(checkActionCode(auth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/verifyPasswordResetCode', () => {
  const oobCode = 'oob-code';
  const email = 'foo@bar.com';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: Operation.PASSWORD_RESET,
      email: 'foo@bar.com',
      previousEmail: null
    });
    const response = await verifyPasswordResetCode(auth, oobCode);
    expect(response).to.eq(email);
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should expect a requestType', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email
    });
    await expect(verifyPasswordResetCode(auth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: An internal AuthError has occurred. (auth/internal-error).'
    );
    expect(mock.calls.length).to.eq(1);
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.RESET_PASSWORD,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_OOB_CODE
        }
      },
      400
    );
    await expect(verifyPasswordResetCode(auth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/email_and_password/createUserWithEmailAndPassword', () => {
  let auth: Auth;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.SIGN_UP, {
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  it('should sign in the user', async () => {
    const {
      credential,
      user,
      operationType
    } = await createUserWithEmailAndPassword(
      auth,
      'some-email',
      'some-password'
    );
    expect(credential!.providerId).to.eq(ProviderId.PASSWORD);
    expect(credential!.signInMethod).to.eq(SignInMethod.EMAIL_PASSWORD);
    expect(operationType).to.eq(OperationType.SIGN_IN);
    expect(user.uid).to.eq(serverUser.localId);
    expect(user.isAnonymous).to.be.false;
  });
});

describe('core/strategies/email_and_password/signInWithEmailAndPassword', () => {
  let auth: Auth;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.SIGN_IN_WITH_PASSWORD, {
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    mockEndpoint(Endpoint.GET_ACCOUNT_INFO, {
      users: [serverUser]
    });
  });
  afterEach(mockFetch.tearDown);

  it('should sign in the user', async () => {
    const {
      credential,
      user,
      operationType
    } = await signInWithEmailAndPassword(auth, 'some-email', 'some-password');
    expect(credential!.providerId).to.eq(ProviderId.PASSWORD);
    expect(credential!.signInMethod).to.eq(SignInMethod.EMAIL_PASSWORD);
    expect(operationType).to.eq(OperationType.SIGN_IN);
    expect(user.uid).to.eq(serverUser.localId);
    expect(user.isAnonymous).to.be.false;
  });
});
