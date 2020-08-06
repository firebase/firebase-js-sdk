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

import * as externs from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';

import { mockEndpoint } from '../../../test/api/helper';
import { testAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { Auth } from '../../model/auth';
import {
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink
} from './email_link';
import {
  ProviderId,
  SignInMethod,
  OperationType
} from '@firebase/auth-types-exp';
import { APIUserInfo } from '../../api/account_management/account';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/sendSignInLinkToEmail', () => {
  const email = 'foo@bar.com';

  let auth: Auth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  it('should send a sign in link via email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      email
    });
    await sendSignInLinkToEmail(auth, email);
    expect(mock.calls[0].request).to.eql({
      requestType: externs.Operation.EMAIL_SIGNIN,
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
    await expect(sendSignInLinkToEmail(auth, email)).to.be.rejectedWith(
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
          bundleId: 'my-bundle',
          appStoreId: 'my-appstore-id'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: externs.Operation.EMAIL_SIGNIN,
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
        requestType: externs.Operation.EMAIL_SIGNIN,
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

describe('core/strategies/isSignInWithEmailLink', () => {
  let auth: Auth;

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
  let auth: Auth;
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
    const { credential, user, operationType } = await signInWithEmailLink(
      auth,
      'some-email',
      actionLink
    );
    expect(credential?.providerId).to.eq(ProviderId.PASSWORD);
    expect(credential?.signInMethod).to.eq(SignInMethod.EMAIL_LINK);
    expect(operationType).to.eq(OperationType.SIGN_IN);
    expect(user.uid).to.eq(serverUser.localId);
    expect(user.isAnonymous).to.be.false;
  });
});
