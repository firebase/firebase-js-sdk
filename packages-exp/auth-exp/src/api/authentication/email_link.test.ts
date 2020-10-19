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
import { mockEndpoint } from '../../../test/helpers/api/helper';
import { testAuth, TestAuth } from '../../../test/helpers/mock_auth';
import * as mockFetch from '../../../test/helpers/mock_fetch';
import { ServerError } from '../errors';
import {
  signInWithEmailLink,
  signInWithEmailLinkForLinking
} from './email_link';

use(chaiAsPromised);

describe('api/authentication/email_link', () => {
  let auth: TestAuth;

  beforeEach(async () => {
    auth = await testAuth();
    mockFetch.setUp();
  });

  afterEach(mockFetch.tearDown);

  context('signInWithEmailLink', () => {
    const request = {
      email: 'foo@bar.com',
      oobCode: 'my-code'
    };

    it('should POST to the correct endpoint', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_EMAIL_LINK, {
        displayName: 'my-name',
        email: 'test@foo.com'
      });

      const response = await signInWithEmailLink(auth, request);
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
        Endpoint.SIGN_IN_WITH_EMAIL_LINK,
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

      await expect(signInWithEmailLink(auth, request)).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is badly formatted. (auth/invalid-email).'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });

  context('signInWithEmailLinkForLinking', () => {
    const request = {
      email: 'foo@bar.com',
      oobCode: 'my-code',
      idToken: 'id-token-2'
    };

    it('should POST to the correct endpoint', async () => {
      const mock = mockEndpoint(Endpoint.SIGN_IN_WITH_EMAIL_LINK, {
        displayName: 'my-name',
        email: 'test@foo.com'
      });

      const response = await signInWithEmailLinkForLinking(auth, request);
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
        Endpoint.SIGN_IN_WITH_EMAIL_LINK,
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

      await expect(
        signInWithEmailLinkForLinking(auth, request)
      ).to.be.rejectedWith(
        FirebaseError,
        'Firebase: The email address is badly formatted. (auth/invalid-email).'
      );
      expect(mock.calls[0].request).to.eql(request);
    });
  });
});
