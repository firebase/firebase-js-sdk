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
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink
} from './email_link';
import { MockGreCAPTCHATopLevel } from '../../platform_browser/recaptcha/recaptcha_mock';
import * as jsHelpers from '../../platform_browser/load_js';
import { _initializeRecaptchaConfig } from '../../platform_browser/recaptcha/recaptcha_enterprise_verifier';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/sendSignInLinkToEmail', () => {
  const email = 'foo@bar.com';

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    auth.settings.appVerificationDisabledForTesting = false;
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should send a sign in link via email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email
    });
    await sendSignInLinkToEmail(auth, email, {
      handleCodeInApp: true,
      url: 'continue-url'
    });
    expect(mock.calls[0].request).to.eql({
      requestType: ActionCodeOperation.EMAIL_SIGNIN,
      email,
      canHandleCodeInApp: true,
      continueUrl: 'continue-url',
      clientType: 'CLIENT_TYPE_WEB'
    });
  });

  it('should require handleCodeInApp to be true', async () => {
    await expect(
      sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: false,
        url: 'continue-url'
      })
    ).to.be.rejectedWith(FirebaseError, 'auth/argument-error).');
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
    await expect(
      sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        url: 'continue-url'
      })
    ).to.be.rejectedWith(
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
      await sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.EMAIL_SIGNIN,
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
      await sendSignInLinkToEmail(auth, email, {
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
        requestType: ActionCodeOperation.EMAIL_SIGNIN,
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
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      sinon
        .stub(recaptcha.enterprise, 'execute')
        .returns(Promise.resolve('recaptcha-response'));
    });

    afterEach(() => {
      sinon.restore();
    });

    it('calls send sign in link to email with recaptcha enabled', async () => {
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
      await sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        url: 'continue-url'
      });
      expect(apiMock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.EMAIL_SIGNIN,
        email,
        canHandleCodeInApp: true,
        continueUrl: 'continue-url',
        captchaResp: 'recaptcha-response',
        clientType: RecaptchaClientType.WEB,
        recaptchaVersion: RecaptchaVersion.ENTERPRISE
      });
    });

    it('calls send sign in link to email with recaptcha disabled', async () => {
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
      await sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        url: 'continue-url'
      });
      expect(apiMock.calls[0].request).to.eql({
        requestType: ActionCodeOperation.EMAIL_SIGNIN,
        email,
        canHandleCodeInApp: true,
        continueUrl: 'continue-url',
        clientType: 'CLIENT_TYPE_WEB'
      });
    });

    it('calls send sign in link to email with recaptcha forced refresh succeed', async () => {
      const recaptcha = new MockGreCAPTCHATopLevel();
      if (typeof window === 'undefined') {
        return;
      }
      window.grecaptcha = recaptcha;
      const stub = sinon.stub(recaptcha.enterprise, 'execute');

      // // First verification should fail with 'wrong-site-key'
      stub
        .withArgs('wrong-site-key', { action: 'signInWithEmailLink' })
        .rejects();
      // Second verifcation should succeed with site key refreshed
      stub
        .withArgs('site-key', { action: 'signInWithEmailLink' })
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
      auth._agentRecaptchaConfig!.siteKey = 'wrong-site-key';

      mockEndpoint(Endpoint.SEND_OOB_CODE, {
        email
      });
      expect(
        sendSignInLinkToEmail(auth, email, {
          handleCodeInApp: true,
          url: 'continue-url'
        })
      ).returned;
    });

    it('calls fallback to recaptcha flow when receiving MISSING_RECAPTCHA_TOKEN error', async () => {
      if (typeof window === 'undefined') {
        return;
      }

      // First call without recaptcha token should fail with MISSING_RECAPTCHA_TOKEN error
      mockEndpointWithParams(
        Endpoint.SEND_OOB_CODE,
        {
          requestType: ActionCodeOperation.EMAIL_SIGNIN,
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
          requestType: ActionCodeOperation.EMAIL_SIGNIN,
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
      const response = await sendSignInLinkToEmail(auth, email, {
        handleCodeInApp: true,
        url: 'continue-url'
      });
      expect(response).to.eq(undefined);
    });
  });
});

describe('core/strategies/isSignInWithEmailLink', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
  });

  context('simple links', () => {
    it('should recognize sign in links', () => {
      const link =
        'https://www.example.com/action?mode=signIn&oobCode=oobCode&apiKey=API_KEY';
      expect(isSignInWithEmailLink(auth, link)).to.be.true;
    });

    it('should not recognize other email links', () => {
      const link =
        'https://www.example.com/action?mode=verifyEmail&oobCode=oobCode&apiKey=API_KEY';
      expect(isSignInWithEmailLink(auth, link)).to.be.false;
    });

    it('should not recognize invalid links', () => {
      const link = 'https://www.example.com/action?mode=signIn';
      expect(isSignInWithEmailLink(auth, link)).to.be.false;
    });
  });

  context('deep links', () => {
    it('should recognize valid links', () => {
      const deepLink =
        'https://www.example.com/action?mode=signIn&oobCode=oobCode&apiKey=API_KEY';
      const link = `https://example.app.goo.gl/?link=${encodeURIComponent(
        deepLink
      )}`;
      expect(isSignInWithEmailLink(auth, link)).to.be.true;
    });

    it('should recognize valid links with deep_link_id', () => {
      const deepLink =
        'https://www.example.com/action?mode=signIn&oobCode=oobCode&apiKey=API_KEY';
      const link = `somexampleiosurl://google/link?deep_link_id=${encodeURIComponent(
        deepLink
      )}`;
      expect(isSignInWithEmailLink(auth, link)).to.be.true;
    });

    it('should reject other email links', () => {
      const deepLink =
        'https://www.example.com/action?mode=verifyEmail&oobCode=oobCode&apiKey=API_KEY';
      const link = `https://example.app.goo.gl/?link=${encodeURIComponent(
        deepLink
      )}`;
      expect(isSignInWithEmailLink(auth, link)).to.be.false;
    });

    it('should reject invalid links', () => {
      const deepLink = 'https://www.example.com/action?mode=signIn';
      const link = `https://example.app.goo.gl/?link=${encodeURIComponent(
        deepLink
      )}`;
      expect(isSignInWithEmailLink(auth, link)).to.be.false;
    });
  });
});

describe('core/strategies/email_and_password/signInWithEmailLink', () => {
  let auth: TestAuth;
  const serverUser: APIUserInfo = {
    localId: 'local-id'
  };

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
    mockEndpoint(Endpoint.SIGN_IN_WITH_EMAIL_LINK, {
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
    const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
    const actionLink =
      'https://www.example.com/finishSignIn?' +
      'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
      'continueUrl=' +
      encodeURIComponent(continueUrl) +
      '&languageCode=en&state=bla';
    const { _tokenResponse, user, operationType } = (await signInWithEmailLink(
      auth,
      'some-email',
      actionLink
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

  context('mismatched tenant ID', () => {
    it('should throw an error', async () => {
      const continueUrl = 'https://www.example.com/path/to/file?a=1&b=2#c=3';
      const actionLink =
        'https://www.example.com/finishSignIn?' +
        'oobCode=CODE&mode=signIn&apiKey=API_KEY&' +
        'continueUrl=' +
        encodeURIComponent(continueUrl) +
        '&languageCode=en&tenantId=OTHER_TENANT_ID&state=bla';
      await expect(
        signInWithEmailLink(auth, 'some-email', actionLink)
      ).to.be.rejectedWith(FirebaseError, 'auth/tenant-id-mismatch');
    });
  });
});
