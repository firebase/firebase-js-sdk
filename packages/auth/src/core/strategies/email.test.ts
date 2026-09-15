/**
 * @license
 * Copyright 2026 Google LLC
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

import { ActionCodeOperation } from '../../model/public_types';
import { ProviderId } from '../../model/enums';
import { FirebaseError, isNode } from '@firebase/util';

import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth, testUser } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { UserInternal } from '../../model/user';
import {
  fetchSignInMethodsForEmail,
  sendEmailVerification,
  verifyBeforeUpdateEmail
} from './email';
import { MockInstance } from 'vitest';
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
    describe('node', () => {
      it('should use localhost for the continueUri', async () => {
        const mock = mockEndpoint(Endpoint.CREATE_AUTH_URI, {
          signinMethods: expectedSignInMethods
        });
        const response = await fetchSignInMethodsForEmail(auth, email);
        expect(response).toEqual(expectedSignInMethods);
        expect(mock.calls[0].request).toEqual({
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
      expect(response).toEqual(expectedSignInMethods);
      const request = mock.calls[0].request as Record<string, string>;
      expect(request['identifier']).toBe(email);
      // We can't rely on a fixed port number
      expect(request['continueUri']).toMatch(/http:\/\/localhost:[0-9]+/);
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
    await expect(fetchSignInMethodsForEmail(auth, email)).rejects.toThrow(
      FirebaseError,
      'Firebase: The email address is badly formatted. (auth/invalid-email).'
    );
    expect(mock.calls.length).toBe(1);
  });
});

describe('core/strategies/sendEmailVerification', () => {
  const email = 'foo@bar.com';
  const idToken = 'access-token';
  let user: UserInternal;
  let auth: TestAuth;
  let reloadStub: MockInstance;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'my-user-uid', email, true);
    mockFetch.setUp();
    reloadStub = vi.spyOn(user, 'reload').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockFetch.tearDown();
    vi.restoreAllMocks();
  });

  it('should send the email verification', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: ActionCodeOperation.VERIFY_EMAIL,
      email
    });

    await sendEmailVerification(user);

    expect(reloadStub).not.toHaveBeenCalled();
    expect(mock.calls[0].request).toEqual({
      requestType: ActionCodeOperation.VERIFY_EMAIL,
      idToken
    });
  });

  it('should reload the user if the API returns a different email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: ActionCodeOperation.VERIFY_EMAIL,
      email: 'other@email.com'
    });

    await sendEmailVerification(user);

    expect(reloadStub).toHaveBeenCalledTimes(1);
    expect(mock.calls[0].request).toEqual({
      requestType: ActionCodeOperation.VERIFY_EMAIL,
      idToken
    });
  });

  describe('on iOS', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: ActionCodeOperation.VERIFY_EMAIL,
        email
      });
      await sendEmailVerification(user, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain'
      });

      expect(mock.calls[0].request).toEqual({
        requestType: ActionCodeOperation.VERIFY_EMAIL,
        idToken,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain',
        canHandleCodeInApp: true,
        iOSBundleId: 'my-bundle'
      });
    });
  });

  describe('on Android', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: ActionCodeOperation.VERIFY_EMAIL,
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
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain'
      });
      expect(mock.calls[0].request).toEqual({
        requestType: ActionCodeOperation.VERIFY_EMAIL,
        idToken,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain',
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
  let user: UserInternal;
  let auth: TestAuth;
  let reloadStub: MockInstance;

  beforeEach(async () => {
    auth = await testAuth();
    user = testUser(auth, 'my-user-uid', email, true);
    mockFetch.setUp();
    reloadStub = vi.spyOn(user, 'reload').mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockFetch.tearDown();
    vi.restoreAllMocks();
  });

  it('should send the email verification', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
      email
    });

    await verifyBeforeUpdateEmail(user, newEmail);

    expect(reloadStub).not.toHaveBeenCalled();
    expect(mock.calls[0].request).toEqual({
      requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
      idToken,
      newEmail
    });
  });

  it('should reload the user if the API returns a different email', async () => {
    const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
      requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
      email: 'other@email.com'
    });

    await verifyBeforeUpdateEmail(user, newEmail);

    expect(reloadStub).toHaveBeenCalledTimes(1);
    expect(mock.calls[0].request).toEqual({
      requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
      idToken,
      newEmail
    });
  });

  describe('on iOS', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
        email
      });
      await verifyBeforeUpdateEmail(user, newEmail, {
        handleCodeInApp: true,
        iOS: {
          bundleId: 'my-bundle'
        },
        url: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain'
      });

      expect(mock.calls[0].request).toEqual({
        requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
        idToken,
        newEmail,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain',
        canHandleCodeInApp: true,
        iOSBundleId: 'my-bundle'
      });
    });
  });

  describe('on Android', () => {
    it('should pass action code parameters', async () => {
      const mock = mockEndpoint(Endpoint.SEND_OOB_CODE, {
        requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
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
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain'
      });
      expect(mock.calls[0].request).toEqual({
        requestType: ActionCodeOperation.VERIFY_AND_CHANGE_EMAIL,
        idToken,
        newEmail,
        continueUrl: 'my-url',
        dynamicLinkDomain: 'fdl-domain',
        linkDomain: 'hosting-link-domain',
        canHandleCodeInApp: true,
        androidInstallApp: false,
        androidMinimumVersionCode: 'my-version',
        androidPackageName: 'my-package'
      });
    });
  });
});
