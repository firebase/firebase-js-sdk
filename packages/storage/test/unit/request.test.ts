/**
 * @license
 * Copyright 2017 Google LLC
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

import { makeRequest } from '../../src/implementation/request';
import { RequestInfo } from '../../src/implementation/requestinfo';
import { Connection } from '../../src/implementation/connection';
import { TestingConnection, newTestConnection } from './connection';

const TEST_VERSION = '1.2.3';

describe('Firebase Storage > Request', () => {
  const versionHeaderName = 'X-Firebase-Storage-Version';
  const versionHeaderValue = 'webjs/' + TEST_VERSION;
  const timeout = 60 * 1000;

  it('Simple success request works', () => {
    const url = 'http://my-url.com/';
    const method = 'GET';

    const status = 234;
    const responseHeader = 'ResponseHeader1';
    const responseValue = 'ResponseValue1';
    const response = 'I am the server response!!!!';

    function newSend(connection: TestingConnection): void {
      const responseHeaders: { [key: string]: string } = {};
      responseHeaders[responseHeader] = responseValue;
      connection.simulateResponse(status, response, responseHeaders);
    }
    const spiedSend = vi.fn(newSend);

    function handler(connection: Connection<string>, text: string): string {
      expect(text).toBe(response);
      expect(connection.getResponseHeader(responseHeader)).toBe(responseValue);
      expect(connection.getStatus()).toBe(status);
      return text;
    }

    const requestHeader = 'RequestHeader1';
    const requestValue = 'RequestValue1';
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = {};
    requestInfo.headers[requestHeader] = requestValue;
    requestInfo.successCodes = [200, 234];

    return makeRequest(
      requestInfo,
      null,
      null,
      null,
      () => newTestConnection(spiedSend),
      TEST_VERSION
    )
      .getPromise()
      .then(
        result => {
          expect(result).toBe(response);
          expect(spiedSend).toHaveBeenCalledTimes(1);

          const args: unknown[] = spiedSend.mock.calls[0];
          expect(args[1]).toBe(url);
          expect(args[2]).toBe(method);
          const expectedHeaders: { [key: string]: string } = {};
          expectedHeaders[requestHeader] = requestValue;
          expectedHeaders[versionHeaderName] = versionHeaderValue;
          expect(args[4]).toEqual(expectedHeaders);
        },
        () => {
          assert.fail('Errored in successful call...');
        }
      );
  });

  it('URL parameters get encoded correctly', () => {
    function newSend(connection: TestingConnection): void {
      connection.simulateResponse(200, '', {});
    }
    const spiedSend = vi.fn(newSend);

    function handler(connection: Connection<string>, text: string): string {
      return text;
    }

    const url = 'http://my-url.com/';
    const method = 'DELETE';
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    const p1 = 'param1';
    const v1 = 'val1';
    const p2 = 'par?am2';
    const v2 = 'v#al?2';
    requestInfo.urlParams = {};
    requestInfo.urlParams[p1] = v1;
    requestInfo.urlParams[p2] = v2;
    requestInfo.body = 'thisistherequestbody';
    return makeRequest(requestInfo, null, null, null, () =>
      newTestConnection(spiedSend)
    )
      .getPromise()
      .then(
        () => {
          expect(spiedSend).toHaveBeenCalledTimes(1);

          const fullUrl =
            url +
            '?' +
            encodeURIComponent(p1) +
            '=' +
            encodeURIComponent(v1) +
            '&' +
            encodeURIComponent(p2) +
            '=' +
            encodeURIComponent(v2);
          const args: unknown[] = spiedSend.mock.calls[0];
          expect(args[1]).toBe(fullUrl);
          expect(args[2]).toBe(method);
          expect(args[3]).toBe(requestInfo.body);
        },
        () => {
          assert.fail('Request failed unexpectedly');
        }
      );
  });

  it('Propagates errors acceptably', () => {
    function newSend(connection: TestingConnection): void {
      connection.simulateResponse(200, '', {});
    }

    const errorMessage = 'Catch me if you can';
    function handler(): string {
      throw new Error(errorMessage);
    }
    const requestInfo = new RequestInfo(
      'http://my-url.com/',
      'GET',
      handler,
      timeout
    );

    return makeRequest(requestInfo, null, null, null, () =>
      newTestConnection(newSend)
    )
      .getPromise()
      .then(
        () => {
          assert.fail('Succeeded when handler gave error');
        },
        error => {
          expect(error.message).toBe(errorMessage);
        }
      );
  });

  it('Cancels properly', () => {
    function handler(): boolean {
      return true;
    }
    const requestInfo = new RequestInfo(
      'http://my-url.com/',
      'GET',
      handler,
      timeout
    );
    const request = makeRequest(
      requestInfo,
      null,
      null,
      null,
      newTestConnection
    );
    const promise = request.getPromise().then(
      () => {
        assert.fail('Succeeded when handler gave error');
      },
      () => true
    );
    request.cancel();
    return promise;
  });

  it('Sends auth tokens along properly', () => {
    function newSend(connection: TestingConnection): void {
      connection.simulateResponse(200, '', {});
    }
    const spiedSend = vi.fn(newSend);

    const authToken = 'totallyLegitAuthToken';
    function handler(): boolean {
      return true;
    }
    const requestInfo = new RequestInfo(
      'http://my-url.com/',
      'GET',
      handler,
      timeout
    );
    const request = makeRequest(
      requestInfo,
      /* appId= */ null,
      authToken,
      null,
      () => newTestConnection(spiedSend),
      TEST_VERSION
    );
    return request.getPromise().then(
      () => {
        expect(spiedSend).toHaveBeenCalledTimes(1);
        const args: unknown[] = spiedSend.mock.calls[0];
        const expectedHeaders: { [key: string]: string } = {
          Authorization: 'Firebase ' + authToken
        };
        expectedHeaders[versionHeaderName] = versionHeaderValue;
        expect(args[4]).toEqual(expectedHeaders);
      },
      () => {
        assert.fail('Request failed unexpectedly');
      }
    );
  });

  it('Sends APP ID along properly', () => {
    const appId = 'myFirebaseApp';

    function newSend(connection: TestingConnection): void {
      connection.simulateResponse(200, '', {});
    }
    const spiedSend = vi.fn(newSend);

    function handler(): boolean {
      return true;
    }
    const requestInfo = new RequestInfo(
      'http://my-url.com/',
      'GET',
      handler,
      timeout
    );
    const request = makeRequest(
      requestInfo,
      appId,
      null,
      null,
      () => newTestConnection(spiedSend),
      TEST_VERSION
    );
    return request.getPromise().then(
      () => {
        expect(spiedSend).toHaveBeenCalledTimes(1);
        const args: unknown[] = spiedSend.mock.calls[0];
        const expectedHeaders: { [key: string]: string } = {
          'X-Firebase-GMPID': appId
        };
        expectedHeaders[versionHeaderName] = versionHeaderValue;
        expect(args[4]).toEqual(expectedHeaders);
      },
      () => {
        assert.fail('Request failed unexpectedly');
      }
    );
  });

  it('sends appcheck token along properly', () => {
    const appCheckToken = 'totallyshaddytoken';

    function newSend(connection: TestingConnection): void {
      connection.simulateResponse(200, '', {});
    }
    const spiedSend = vi.fn(newSend);

    function handler(): boolean {
      return true;
    }
    const requestInfo = new RequestInfo(
      'http://my-url.com/',
      'GET',
      handler,
      timeout
    );
    const request = makeRequest(
      requestInfo,
      null,
      null,
      appCheckToken,
      () => newTestConnection(spiedSend),
      TEST_VERSION
    );
    return request.getPromise().then(
      () => {
        expect(spiedSend).toHaveBeenCalledTimes(1);
        const args: unknown[] = spiedSend.mock.calls[0];
        const expectedHeaders: { [key: string]: string } = {
          'X-Firebase-AppCheck': appCheckToken
        };
        expectedHeaders[versionHeaderName] = versionHeaderValue;
        expect(args[4]).toEqual(expectedHeaders);
      },
      () => {
        assert.fail('Request failed unexpectedly');
      }
    );
  });
});
