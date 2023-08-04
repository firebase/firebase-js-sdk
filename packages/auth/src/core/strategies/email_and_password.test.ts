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
import chaiAsPromised from 'chai-as-promised';
import sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

import { ActionCodeOperation } from '../../model/public_types';
import { OperationType } from '../../model/enums';
import { FirebaseError } from '@firebase/util';
import * as jsHelpers from '../../platform_browser/load_js';

import {
  mockEndpoint,
  mockEndpointWithParams
} from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import {
  Endpoint,
  RecaptchaClientType,
  RecaptchaVersion,
  RecaptchaActionName
} from '../../api';
import { APIUserInfo } from '../../api/account_management/account';
import { ServerError } from '../../api/errors';
import { UserCredentialInternal } from '../../model/user';
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  verifyPasswordResetCode
} from './email_and_password';
import { MockGreCAPTCHATopLevel } from '../../platform_browser/recaptcha/recaptcha_mock';
import { _initializeRecaptchaConfig } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/sendPasswordResetEmail', () => {
  const email = 'foo@bar.com';

  let auth: TestAuth;

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
      requestType: ActionCodeOperation.PASSWORD_RESET,
      email,
      clientType: 'CLIENT_TYPE_WEB'
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
          bundleId: 'my-bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.PASSWORD_RESET,
        email,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        canHandleCodeInApp: true,
        iOSBundleId: 'my-bundle',
        clientType: 'CLIENT_TYPE_WEB'
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
        requestType: ActionCodeOperation.PASSWORD_RESET,
        email,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        canHandleCodeInApp: true,
        androidInstallApp: false,
        androidMinimumVersionCode: 'my-version',
        androidPackageName: 'my-package',
        clientType: 'CLIENT_TYPE_WEB'
      });
    });
  });

  context('#recaptcha', () => {
    const recaptchaConfigResponseEnforce = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        {
          provider: 'EMAIL_PASSWORD_PROVIDER',
          enforcementState: 'ENFORCE'
        }
      ]
    };
    const recaptchaConfigResponseOff = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        { provider: 'EMAIL_PASSWORD_PROVIDER', enforcementState: 'OFF' }
      ]
    };
    beforeEach(async () => {
      if (typeof window === 'undefined') {
        return;
      }
      const recaptcha = new MockGreCAPTCHATopLevel();
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('recaptcha-response'));
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
    });

    afterEach(() => {
      sinon.restore();
    });

    it('calls send password reset email with recaptcha enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const apiMock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email
      });
      await sendPasswordResetEmail(auth, email);

      expect(apiMock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.PASSWORD_RESET,
        email,
        captchaResp: 'recaptcha-response',
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls send password reset with recaptcha disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseOff
      );
      await _initializeRecaptchaConfig(auth);

      const apiMock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email
      });
      await sendPasswordResetEmail(auth, email);
      expect(apiMock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.PASSWORD_RESET,
        email,
        clientType: 'CLIENT_TYPE_WEB'
      });
    });

    it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
      if (typeof window === 'undefined') {
        return;
      }

      // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
      mockEndpointWithParams(
        Endpoint.SEND_OOB_CODE,
        {
          requestType: ActionCodeOperation.PASSWORD_RESET,
          email,
          clientType: RecaptchaClientType.WEB
        },
        {
          error: {
            code: 400,
            message: ServerError.MISSING_RECAPTCHA_TOKEN
          }
        },
        400
      );

      // Second call with a valid recaptcha token (captchaResp) should succeed
      mockEndpointWithParams(
        Endpoint.SEND_OOB_CODE,
        {
          requestType: ActionCodeOperation.PASSWORD_RESET,
          email,
          captchaResp: 'recaptcha-response',
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        },
        {
          email
        }
      );

      // Mock recaptcha js loading method and manually set window.recaptcha
      sinon.stub(jsHelpers, '_loadJS').returns(Promise.resolve(new Event('')));
      const recaptcha = new MockGreCAPTCHATopLevel();
      window.grecaptcha = recaptcha;
      const stub = sinon.stub(recaptcha.enterprise, 'execute');
      stub
        .withArgs('site-key', {
          action: RecaptchaActionName.GET_OOB_CODE
        })
        .returns(Promise.resolve('recaptcha-response'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      mockEndpoint(Endpoint.SEND_OOB_CODE, { email });
      const response = await sendPasswordResetEmail(auth, email);
      expect(response).to.eq(undefined);
    });
  });
});

describe('core/strategies/confirmPasswordReset', () => {
  const oobCode = 'oob-code';
  const newPassword = 'new-password';

  let auth: TestAuth;

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

  let auth: TestAuth;

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

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: ActionCodeOperation.PASSWORD_RESET,
      email: 'foo@bar.com'
    });
    const response = await checkActionCode(auth, oobCode);
    expect(response).to.eql({
      data: {
        email,
        previousEmail: null,
        multiFactorInfo: null
      },
      operation: ActionCodeOperation.PASSWORD_RESET
    });
    expect(mock.calls[0].request).to.eql({
      oobCode
    });
  });

  it('should return the newEmail', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: ActionCodeOperation.PASSWORD_RESET,
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
      operation: ActionCodeOperation.PASSWORD_RESET
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

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should verify the oob code', async () => {
    const mock = mockEndpoint(Endpoint.RESET_PASSWORD, {
      requestType: ActionCodeOperation.PASSWORD_RESET,
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
  let auth: TestAuth;
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
    const { _tokenResponse, user, operationType } =
      (await createUserWithEmailAndPassword(
        auth,
        'some-email',
        'some-password'
      )) as UserCredentialInternal;
    expect(_tokenResponse).to.eql({
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    expect(operationType).to.eq(OperationType.SIGN_IN);
    expect(user.uid).to.eq(serverUser.localId);
    expect(user.isAnonymous).to.be.false;
  });

  context('#recaptcha', () => {
    const recaptchaConfigResponseEnforce = {
      recaptchaKey: 'foo/bar/to/site-key',
      recaptchaEnforcementState: [
        {
          provider: 'EMAIL_PASSWORD_PROVIDER',
          enforcementState: 'ENFORCE'
        }
      ]
    };

    beforeEach(async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('recaptcha-response'));
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
    });

    afterEach(() => {
      sinon.restore();
    });

    it('calls create user with email password with recaptcha enabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const { _tokenResponse, user, operationType } =
        (await createUserWithEmailAndPassword(
          auth,
          'some-email',
          'some-password'
        )) as UserCredentialInternal;
      expect(_tokenResponse).to.eql({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '1234',
        localId: serverUser.localId!
      });
      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user.uid).to.eq(serverUser.localId);
      expect(user.isAnonymous).to.be.false;
    });

    it('calls create user with email password with recaptcha disabled', async () => {
      if (typeof window === 'undefined') {
        return;
      }
      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const { _tokenResponse, user, operationType } =
        (await createUserWithEmailAndPassword(
          auth,
          'some-email',
          'some-password'
        )) as UserCredentialInternal;
      expect(_tokenResponse).to.eql({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '1234',
        localId: serverUser.localId!
      });
      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user.uid).to.eq(serverUser.localId);
      expect(user.isAnonymous).to.be.false;
    });

    it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
      if (typeof window === 'undefined') {
        return;
      }

      // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
      mockEndpointWithParams(
        Endpoint.SIGN_UP,
        {
          email: 'some-email',
          password: 'some-password',
          clientType: RecaptchaClientType.WEB
        },
        {
          error: {
            code: 400,
            message: ServerError.MISSING_RECAPTCHA_TOKEN
          }
        },
        400
      );

      // Second call with a valid recaptcha token (captchaResp) should succeed
      mockEndpointWithParams(
        Endpoint.SIGN_UP,
        {
          email: 'some-email',
          password: 'some-password',
          captchaResp: 'recaptcha-response',
          clientType: RecaptchaClientType.WEB,
          recaptchaVersion: RecaptchaVersion.ENTERPRISE
        },
        {
          idToken: 'id-token',
          refreshToken: 'refresh-token',
          expiresIn: '1234',
          localId: serverUser.localId!
        }
      );

      // Mock recaptcha js loading method and manually set window.recaptcha
      sinon.stub(jsHelpers, '_loadJS').returns(Promise.resolve(new Event('')));
      const recaptcha = new MockGreCAPTCHATopLevel();
      window.grecaptcha = recaptcha;
      const stub = sinon.stub(recaptcha.enterprise, 'execute');
      stub
        .withArgs('site-key', {
          action: RecaptchaActionName.SIGN_UP_PASSWORD
        })
        .returns(Promise.resolve('recaptcha-response'));

      mockEndpointWithParams(
        Endpoint.GET_RECAPTCHA_CONFIG,
        {
          clientType: RecaptchaClientType.WEB,
          version: RecaptchaVersion.ENTERPRISE
        },
        recaptchaConfigResponseEnforce
      );
      await _initializeRecaptchaConfig(auth);

      const { _tokenResponse, user, operationType } =
        (await createUserWithEmailAndPassword(
          auth,
          'some-email',
          'some-password'
        )) as UserCredentialInternal;
      expect(_tokenResponse).to.eql({
        idToken: 'id-token',
        refreshToken: 'refresh-token',
        expiresIn: '1234',
        localId: serverUser.localId!
      });
      expect(operationType).to.eq(OperationType.SIGN_IN);
      expect(user.uid).to.eq(serverUser.localId);
      expect(user.isAnonymous).to.be.false;
    });
  });
});

describe('core/strategies/email_and_password/signInWithEmailAndPassword', () => {
  let auth: TestAuth;
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
    const { _tokenResponse, user, operationType } =
      (await signInWithEmailAndPassword(
        auth,
        'some-email',
        'some-password'
      )) as UserCredentialInternal;
    expect(_tokenResponse).to.eql({
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      expiresIn: '1234',
      localId: serverUser.localId!
    });
    expect(operationType).to.eq(OperationType.SIGN_IN);
    expect(user.uid).to.eq(serverUser.localId);
    expect(user.isAnonymous).to.be.false;
  });
});
