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
import * as sinonChai from 'sinon-chai';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { Operation } from '../../model/action_code_info';
import {
  checkActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  verifyPasswordResetCode
} from './email_and_password';

use(chaiAsPromised);
use(sinonChai);

describe('sendPasswordResetEmail', () => {
  const email = 'foo@bar.com';

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should send a password reset email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email
    });
    await sendPasswordResetEmail(mockAuth, email);
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
    await expect(sendPasswordResetEmail(mockAuth, email)).to.be.rejectedWith(
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
      await sendPasswordResetEmail(mockAuth, email, {
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
      await sendPasswordResetEmail(mockAuth, email, {
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

describe('confirmPasswordReset', () => {
  const oobCode = 'oob-code';
  const newPassword = 'new-password';

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should confirm the password reset and not return the email', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email: 'foo@bar.com'
    });
    const response = await confirmPasswordReset(mockAuth, oobCode, newPassword);
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
      confirmPasswordReset(mockAuth, oobCode, newPassword)
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('checkActionCode', () => {
  const oobCode = 'oob-code';
  const email = 'foo@bar.com';
  const newEmail = 'new@email.com';

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: Operation.PASSWORD_RESET,
      email: 'foo@bar.com'
    });
    const response = await checkActionCode(mockAuth, oobCode);
    expect(response).to.eql({
      data: {
        email,
        fromEmail: null
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
    const response = await checkActionCode(mockAuth, oobCode);
    expect(response).to.eql({
      data: {
        email,
        fromEmail: newEmail
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
    await expect(checkActionCode(mockAuth, oobCode)).to.be.rejectedWith(
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
    await expect(checkActionCode(mockAuth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('verifyPasswordResetCode', () => {
  const oobCode = 'oob-code';
  const email = 'foo@bar.com';

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: Operation.PASSWORD_RESET,
      email: 'foo@bar.com'
    });
    const response = await verifyPasswordResetCode(mockAuth, oobCode);
    expect(response).to.eq(email);
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should expect a requestType', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      email
    });
    await expect(verifyPasswordResetCode(mockAuth, oobCode)).to.be.rejectedWith(
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
    await expect(verifyPasswordResetCode(mockAuth, oobCode)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The action code is invalid. This can happen if the code is malformed, expired, or has already been used. (auth/invalid-action-code).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});
