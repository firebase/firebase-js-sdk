/**
 * @license
 * Copyright 2024 Google LLC
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
import * as sinon from 'sinon';

import { dcFetch, initializeFetch } from '../../src/network/fetch';
import { CallerSdkTypeEnum } from '../../src/network/transport';
use(chaiAsPromised);
function mockFetch(json: object): void {
  const fakeFetchImpl = sinon.stub().returns(
    Promise.resolve({
      json: () => {
        return Promise.resolve(json);
      },
      status: 401
    } as Response)
  );
  initializeFetch(fakeFetchImpl);
}
describe('fetch', () => {
  it('should throw an error with just the message when the server responds with an error with a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    mockFetch({
      code: 401,
      message
    });
    await expect(
      dcFetch(
        'http://localhost',
        {
          name: 'n',
          operationName: 'n',
          variables: {}
        },
        {} as AbortController,
        null,
        null,
        null,
        CallerSdkTypeEnum.Base
      )
    ).to.eventually.be.rejectedWith(message);
  });
  it('should throw a stringified message when the server responds with an error without a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    const json = {
      code: 401,
      message1: message
    };
    mockFetch(json);
    await expect(
      dcFetch(
        'http://localhost',
        {
          name: 'n',
          operationName: 'n',
          variables: {}
        },
        {} as AbortController,
        null,
        null,
        null,
        CallerSdkTypeEnum.Base
      )
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
  });
});
