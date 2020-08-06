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
import { Endpoint } from '..';
import { mockEndpoint } from '../../../test/api/helper';
import { mockAuth } from '../../../test/mock_auth';
import * as mockFetch from '../../../test/mock_fetch';
import { ServerError } from '../errors';
import { getRecaptchaParams } from './recaptcha';

use(chaiAsPromised);

describe('getRecaptchaParams', () => {
  beforeEach(mockFetch.setUp);
  afterEach(mockFetch.tearDown);

  it('should GET to the correct endpoint', async () => {
    const mock = mockEndpoint(Endpoint.GET_RECAPTCHA_PARAM, {
      recaptchaSiteKey: 'site-key'
    });

    const response = await getRecaptchaParams(mockAuth);
    expect(response).to.eq('site-key');
    expect(mock.calls[0].request).to.be.undefined;
    expect(mock.calls[0].method).to.eq('GET');
    expect(mock.calls[0].headers).to.eql({
      'Content-Type': 'application/json',
      'X-Client-Version': 'testSDK/0.0.0'
    });
  });

  it('should handle errors', async () => {
    const mock = mockEndpoint(
      Endpoint.GET_RECAPTCHA_PARAM,
      {
        error: {
          code: 400,
          message: ServerError.TOO_MANY_ATTEMPTS_TRY_LATER,
          errors: [
            {
              message: ServerError.TOO_MANY_ATTEMPTS_TRY_LATER
            }
          ]
        }
      },
      400
    );

    await expect(getRecaptchaParams(mockAuth)).to.be.rejectedWith(
      FirebaseError,
      'Firebase: We have blocked all requests from this device due to unusual activity. Try again later. (auth/too-many-requests).'
    );
    expect(mock.calls[0].request).to.be.undefined;
  });
});
