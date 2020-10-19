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
import { restore, SinonStub, stub } from 'sinon';
import * as sinonChai from 'sinon-chai';

import { Operation, ProviderId } from '@firebase/auth-types-exp';
import { FirebaseError, isNode } from '@firebase/util';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { User } from '../../model/user';
import {
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from './email';

use(chaiAsPromised);
use(sinonChai);

describe('core/strategies/fetchSignInMethodsForEmail', () => {
  const email = 'foo@bar.com';
  const expectedSignInMethods = [ProviderId.PASSWORD, ProviderId.GOOGLE];

  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  if (isNode()) {
    context('node', () => {
      it('should use localhost for the continueUri', async () => {
        const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
          signinMethods: expectedSignInMethods
        });
        const response = await fetchSignInMethodsForEmail(auth, email);
        expect(response).to.eql(expectedSignInMethods);
        expect(mock.calls[0].request).to.eql({
          identifier: email,
          continueUri: 'http://localhost'
        });
      });
    });
  } else {
    it('should return the sign in methods', async () => {
      const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
        signinMethods: expectedSignInMethods
      });
      const response = await fetchSignInMethodsForEmail(auth, email);
      expect(response).to.eql(expectedSignInMethods);
      const request = mock.calls[0].request as Record<string, string>;
      expect(request['identifier']).to.eq(email);
      // We can't rely on a fixed port number
      expect(request['continueUri']).to.match(
        /http:\/\/localhost:[0-9]+\/context\.html/
      );
    });
  }

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
    await expect(fetchSignInMethodsForEmail(auth, email)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls.length).to.eq(1);
  });
});

describe('core/strategies/sendEmailVerification', () => {
  const email = 'foo@bar.com';
  const idToken = 'access-token';
  let user: User;
  let auth: TestAuth;
  let reloadStub: SinonStub;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'my-user-uid', email, true);
    mockFetch.setUp();
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

    await sendEmailVerification(user);

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

    await sendEmailVerification(user);

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
      await sendEmailVerification(user, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
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
        iosBundleId: 'my-bundle'
      });
    });
  });

  context('on Android', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: Operation.VERIFY_EMAIL,
        email
      });
      await sendEmailVerification(user, {
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

describe('core/strategies/verifyBeforeUpdateEmail', () => {
  const email = 'foo@bar.com';
  const newEmail = 'newemail@bar.com';
  const idToken = 'access-token';
  let user: User;
  let auth: TestAuth;
  let reloadStub: SinonStub;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'my-user-uid', email, true);
    mockFetch.setUp();
    reloadStub = stub(user, 'reload');
  });

  afterEach(() => {
    mockFetch.tearDown();
    restore();
  });

  it('should send the email verification', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
      email
    });

    await verifyBeforeUpdateEmail(user, newEmail);

    expect(reloadStub).to.not.have.been.called;
    expect(mock.calls[0].request).to.eql({
      requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
      idToken,
      newEmail
    });
  });

  it('should reload the user if the API returns a different email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
      email: 'other@email.com'
    });

    await verifyBeforeUpdateEmail(user, newEmail);

    expect(reloadStub).to.have.been.calledOnce;
    expect(mock.calls[0].request).to.eql({
      requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
      idToken,
      newEmail
    });
  });

  context('on iOS', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
        email
      });
      await verifyBeforeUpdateEmail(user, newEmail, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain'
      });

      expect(mock.calls[0].request).to.eql({
        requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
        idToken,
        newEmail,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        canHandleCodeInApp: true,
        iosBundleId: 'my-bundle'
      });
    });
  });

  context('on Android', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
        email
      });
      await verifyBeforeUpdateEmail(user, newEmail, {
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
        requestType: Operation.VERIFY_AND_CHANGE_EMAIL,
        idToken,
        newEmail,
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
