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

import type { Mock } from 'vitest';

import { CallerSdkType, CallerSdkTypeEnum } from '../../src/network';
import { dcFetch, initializeFetch } from '../../src/network/rest';
function mockFetch(json: object, reject: boolean): Mock {
  const fakeFetchImpl = vi.fn().mockReturnValue(
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
        message,
        extensions: {
          dataConnect: []
        }
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
    ).rejects.toThrow(message);
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
    ).rejects.toThrow(JSON.stringify(json));
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
    ).rejects.toMatchObject({
      response: {
        data: json.data,
        errors: json.errors
      }
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
        expect(fakeFetchImpl).toHaveBeenCalledWith(
          'http://localhost',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Goog-Api-Client': expect.stringMatching(expectedHeaderRegex)
            })
          })
        );
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
        expect(fakeFetchImpl).toHaveBeenCalledWith(
          'http://localhost',
          expect.objectContaining({
            headers: expect.objectContaining({
              'X-Goog-Api-Client': expect.stringMatching(expectedHeaderRegex)
            })
          })
        );
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
    expect(fakeFetchImpl).toHaveBeenCalledWith(
      'https://abc.cloudworkstations.dev',
      expect.objectContaining({ credentials: 'include' })
    );
  });
});
