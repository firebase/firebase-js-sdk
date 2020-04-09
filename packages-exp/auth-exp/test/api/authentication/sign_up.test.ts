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

import * as mockFetch from '../../mock_fetch';
import { signUp, SignUpRequest } from '../../../src/api/authentication/sign_up';
import { expect } from 'chai';
import { Endpoint } from '../../../src/api';
import { ServerError } from '../../../src/api/errors';
import { mockEndpoint, mockAuth } from '../helper';

describe('signUp', () => {
  const request: SignUpRequest = {
    returnSecureToken: true,
    email: 'test@foo.com',
    password: 'my-password'
  };

  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should POST to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_UP, { displayName: 'my-name', email: 'test@foo.com' });

    const response = await signUp(mockAuth, request);
    expect(response.displayName).to.eq('my-name');
    expect(response.email).to.eq('test@foo.com');
    expect(mock.calls[0]).to.eql({
      request
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(Endpoint.SIGN_UP, {
      error: {
        code: 400,
        message: ServerError.EMAIL_EXISTS,
        errors: [
          {
            message: ServerError.EMAIL_EXISTS,
          }
        ]
      }
    }, 400);

    try {
      await signUp(mockAuth, request);
    } catch (e) {
      expect(e.name).to.eq('FirebaseError');
      expect(e.message).to.eq('Firebase: The email address is already in use by another account. (auth/email-already-in-use).');
      expect(mock.calls[0]).to.eql({
        request
      });
    }
  });
});