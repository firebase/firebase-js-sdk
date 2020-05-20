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

import { ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError } from '@firebase/util';
import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { restore, SinonStub, stub } from 'sinon';
import * as sinonChai from 'sinon-chai';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth, testUser } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { Operation } from '../../model/action_code_info';
import * as location from '../util/location';
import { fetchSignInMethodsForEmail, sendEmailVerification } from './email';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/fetchSignInMethodsForEmail', () => {
  const email = 'foo@bar.com';
  const expectedSignInMethods = [ProviderId.PASSWORD, ProviderId.GOOGLE];

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should return the sign in methods', async () => {
    const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
      signinMethods: expectedSignInMethods
    });
    const response = await fetchSignInMethodsForEmail(mockAuth, email);
    expect(response).to.eql(expectedSignInMethods);
    expect(mock.calls[0].request).to.eql({
      identifier: email,
      continueUri: location._getCurrentUrl()
    });
  });

  context('on non standard platforms', () => {
    let locationStub: SinonStub;

    beforeEach(() => {
      locationStub = stub(location, '_isHttpOrHttps');
      locationStub.callsFake(() => false);
    });

    afterEach(() => {
      locationStub.restore();
    });

    it('should use localhost for the continueUri', async () => {
      const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
        signinMethods: expectedSignInMethods
      });
      const response = await fetchSignInMethodsForEmail(mockAuth, email);
      expect(response).to.eql(expectedSignInMethods);
      expect(mock.calls[0].request).to.eql({
        identifier: email,
        continueUri: 'http://localhost'
      });
    });
  });

  it('should surface errors', async () => {
    const mock = mockEndpoint(
      Endpoint.CREATE_AUTH_URI,
      {
        error: {
          code: 400,
          message: ServerError.INVALID_EMAIL
        }
      },
      400
    );
    await expect(
      fetchSignInMethodsForEmail(mockAuth, email)
    ).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/sendEmailVerification', () => {
  const email = 'foo@bar.com';
  const user = testUser('my-user-uid', email);
  const idToken = 'id-token';
  let idTokenStub: SinonStub;
  let reloadStub: SinonStub;

  beforeEach(() => {
    mockFetch.setUp();
    idTokenStub = stub(user, 'getIdToken');
    idTokenStub.callsFake(async () => idToken);
    reloadStub = stub(user, 'reload');
  });

  afterEach(() => {
    mockFetch.tearDown();
    restore();
  });

  it('should send the email verification', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: Operation.VERIFY_EMAIL,
      email
    });

    await sendEmailVerification(mockAuth, user);

    expect(reloadStub).to.not.have.been.called;
    expect(mock.calls[0].request).to.eql({
      requestType: Operation.VERIFY_EMAIL,
      idToken
    });
  });

  it('should reload the user if the API returns a different email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: Operation.VERIFY_EMAIL,
      email: 'other@email.com'
    });

    await sendEmailVerification(mockAuth, user);

    expect(reloadStub).to.have.been.calledOnce;
    expect(mock.calls[0].request).to.eql({
      requestType: Operation.VERIFY_EMAIL,
      idToken
    });
  });

  context('on iOS', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: Operation.VERIFY_EMAIL,
        email
      });
      await sendEmailVerification(mockAuth, user, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle',
          appStoreId: 'my-appstore-id'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: Operation.VERIFY_EMAIL,
        idToken,
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
        requestType: Operation.VERIFY_EMAIL,
        email
      });
      await sendEmailVerification(mockAuth, user, {
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
        requestType: Operation.VERIFY_EMAIL,
        idToken,
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
