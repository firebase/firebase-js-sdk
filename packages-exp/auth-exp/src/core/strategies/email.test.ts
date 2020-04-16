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
import { SinonStub, stub } from 'sinon';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { Endpoint } from '../../api';
import { ServerError } from '../../api/errors';
import { ProviderId } from '../providers';
import * as location from '../util/location';
import { fetchSignInMethodsForEmail } from './email';

use(chaiAsPromised);

describe('fetchSignInMethodsForEmail', () => {
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
      continueUri: location.getCurrentUrl()
    });
  });

  context('on non standard platforms', () => {
    let locationStub: SinonStub;

    beforeEach(() => {
      locationStub = stub(location, 'isHttpOrHttps');
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
