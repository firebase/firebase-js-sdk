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
import sinonChai from 'sinon-chai';

import { dcFetch, initializeFetch } from '../../src/network/fetch';
import { CallerSdkType, CallerSdkTypeEnum } from '../../src/network/transport';
use(chaiAsPromised);
use(sinonChai);
function mockFetch(json: object, reject: boolean): sinon.SinonStub {
  const fakeFetchImpl = sinon.stub().returns(
    Promise.resolve({
      json: () => {
        return Promise.resolve(json);
      },
      status: reject ? 401 : 200
    } as Response)
  );
  initializeFetch(fakeFetchImpl);
  return fakeFetchImpl;
}
describe('fetch', () => {
  it('should throw an error with just the message when the server responds with an error with a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    mockFetch(
      {
        code: 401,
        message
      },
      true
    );
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
        false,
        CallerSdkTypeEnum.Base,
        false
      )
    ).to.eventually.be.rejectedWith(message);
  });
  it('should throw a stringified message when the server responds with an error without a message property in the body', async () => {
    const message = 'Failed to connect to Postgres instance';
    const json = {
      code: 401,
      message1: message
    };
    mockFetch(json, true);
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
        false,
        CallerSdkTypeEnum.Base,
        false
      )
    ).to.eventually.be.rejectedWith(JSON.stringify(json));
  });
  it('should throw a stringified message when the server responds with an error without a message property in the body', async () => {
    const json = {
      'data': { 'abc': 'def' },
      'errors': [
        {
          'message':
            'SQL query error: pq: duplicate key value violates unique constraint movie_pkey',
          'locations': [],
          'path': ['the_matrix'],
          'extensions': null
        }
      ]
    };
    mockFetch(json, false);
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
        false,
        CallerSdkTypeEnum.Base,
        false
      )
    ).to.eventually.be.rejected.then(error => {
      expect(error.response.data).to.eq(json.data);
      expect(error.response.errors).to.eq(json.errors);
    });
  });
  it('should assign different values to custom headers based on the _callerSdkType argument (_isUsingGen is false)', async () => {
    const json = {
      code: 200,
      message1: 'success'
    };
    const fakeFetchImpl = mockFetch(json, false);

    for (const callerSdkType in CallerSdkTypeEnum) {
      // this check is done to follow the best practices outlined by the "guard-for-in" eslint rule
      if (
        Object.prototype.hasOwnProperty.call(CallerSdkTypeEnum, callerSdkType)
      ) {
        await dcFetch(
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
          false, // _isUsingGen is false
          callerSdkType as CallerSdkType,
          false
        );

        let expectedHeaderRegex: RegExp;
        if (callerSdkType === CallerSdkTypeEnum.Base) {
          // should not contain any "js/xxx" substring
          expectedHeaderRegex = RegExp(/^((?!js\/\w).)*$/);
        } else if (callerSdkType === CallerSdkTypeEnum.Generated) {
          expectedHeaderRegex = RegExp(/js\/gen/);
        } else {
          expectedHeaderRegex = RegExp(`js\/${callerSdkType.toLowerCase()}`);
        }
        expect(
          fakeFetchImpl.calledWithMatch(
            'http://localhost',
            sinon.match.hasNested(
              'headers.X-Goog-Api-Client',
              sinon.match(expectedHeaderRegex)
            )
          )
        ).to.be.true;
      }
    }
  });
  it('should assign custom headers based on _callerSdkType before checking to-be-deprecated _isUsingGen', async () => {
    const json = {
      code: 200,
      message1: 'success'
    };
    const fakeFetchImpl = mockFetch(json, false);

    for (const callerSdkType in CallerSdkTypeEnum) {
      // this check is done to follow the best practices outlined by the "guard-for-in" eslint rule
      if (
        Object.prototype.hasOwnProperty.call(CallerSdkTypeEnum, callerSdkType)
      ) {
        await dcFetch(
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
          true, // _isUsingGen is true
          callerSdkType as CallerSdkType,
          false
        );

        let expectedHeaderRegex: RegExp;
        if (
          callerSdkType === CallerSdkTypeEnum.Generated ||
          callerSdkType === CallerSdkTypeEnum.Base
        ) {
          expectedHeaderRegex = RegExp(`js\/gen`);
        } else {
          expectedHeaderRegex = RegExp(`js\/${callerSdkType.toLowerCase()}`);
        }
        expect(
          fakeFetchImpl.calledWithMatch(
            'http://localhost',
            sinon.match.hasNested(
              'headers.X-Goog-Api-Client',
              sinon.match(expectedHeaderRegex)
            )
          )
        ).to.be.true;
      }
    }
  });
  it('should call credentials include if using emulator on cloud workstation', async () => {
    const json = {
      code: 200,
      message1: 'success'
    };
    const fakeFetchImpl = mockFetch(json, false);
    await dcFetch(
      'https://abc.cloudworkstations.dev',
      {
        name: 'n',
        operationName: 'n',
        variables: {}
      },
      {} as AbortController,
      null,
      null,
      null,
      true, // _isUsingGen is true
      CallerSdkTypeEnum.Base,
      true
    );
    expect(fakeFetchImpl).to.have.been.calledWithMatch(
      'https://abc.cloudworkstations.dev',
      { credentials: 'include' }
    );
  });
});
