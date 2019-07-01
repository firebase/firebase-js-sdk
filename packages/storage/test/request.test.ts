/**
 * @license
 * Copyright 2017 Google Inc.
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
import { assert } from 'chai';
import * as sinon from 'sinon';
import firebase from '@firebase/app';
import { makeRequest } from '../src/implementation/request';
import { RequestInfo } from '../src/implementation/requestinfo';
import { XhrIo } from '../src/implementation/xhrio';
import { makePool } from './testshared';
import { TestingXhrIo } from './xhrio';

describe('Firebase Storage > Request', () => {
  const versionHeaderName = 'X-Firebase-Storage-Version';
  const versionHeaderValue = 'webjs/' + firebase.SDK_VERSION;
  const timeout = 60 * 1000;

  it('Simple success request works', () => {
    const url = 'http://my-url.com/';
    const method = 'GET';

    const status = 234;
    const responseHeader = 'ResponseHeader1';
    const responseValue = 'ResponseValue1';
    const response = 'I am the server response!!!!';

    function newSend(xhrio: TestingXhrIo): void {
      const responseHeaders: { [key: string]: string } = {};
      responseHeaders[responseHeader] = responseValue;
      xhrio.simulateResponse(status, response, responseHeaders);
    }
    const spiedSend = sinon.spy(newSend);

    function handler(xhr: XhrIo, text: string): string {
      assert.equal(text, response);
      assert.equal(xhr.getResponseHeader(responseHeader), responseValue);
      assert.equal(xhr.getStatus(), status);
      return text;
    }

    const requestHeader = 'RequestHeader1';
    const requestValue = 'RequestValue1';
    const requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = {};
    requestInfo.headers[requestHeader] = requestValue;
    requestInfo.successCodes = [200, 234];

    return makeRequest(requestInfo, null, makePool(spiedSend))
      .getPromise()
      .then(
        result => {
          assert.equal(result, response);
          assert.isTrue(spiedSend.calledOnce);

          const args: unknown[] = spiedSend.getCall(0).args;
          assert.equal(args[1], url);
          assert.equal(args[2], method);
          const expectedHeaders: { [key: string]: string } = {};
          expectedHeaders[requestHeader] = requestValue;
          expectedHeaders[versionHeaderName] = versionHeaderValue;
          assert.deepEqual(args[4], expectedHeaders);
        },
        () => {
          assert.fail('Errored in successful call...');
        }
      );
  });

  it('URL parameters get encoded correctly', () => {
    function newSend(xhrio: TestingXhrIo): void {
      xhrio.simulateResponse(200, '', {});
    }
    const spiedSend = sinon.spy(newSend);

    function handler(xhr: XhrIo, text: string): string {
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
    return makeRequest(requestInfo, null, makePool(spiedSend))
      .getPromise()
      .then(
        () => {
          assert.isTrue(spiedSend.calledOnce);

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
          const args: unknown[] = spiedSend.getCall(0).args;
          assert.equal(args[1], fullUrl);
          assert.equal(args[2], method);
          assert.equal(args[3], requestInfo.body);
        },
        () => {
          assert.fail('Request failed unexpectedly');
        }
      );
  });

  it('Propagates errors acceptably', () => {
    function newSend(xhrio: TestingXhrIo): void {
      xhrio.simulateResponse(200, '', {});
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

    return makeRequest(requestInfo, null, makePool(newSend))
      .getPromise()
      .then(
        () => {
          assert.fail('Succeeded when handler gave error');
        },
        error => {
          assert.equal(error.message, errorMessage);
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
    const request = makeRequest(requestInfo, null, makePool(null));
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
    function newSend(xhrio: TestingXhrIo): void {
      xhrio.simulateResponse(200, '', {});
    }
    const spiedSend = sinon.spy(newSend);

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
    const request = makeRequest(requestInfo, authToken, makePool(spiedSend));
    return request.getPromise().then(
      () => {
        assert.isTrue(spiedSend.calledOnce);
        const args: unknown[] = spiedSend.getCall(0).args;
        const expectedHeaders: { [key: string]: string } = {
          Authorization: 'Firebase ' + authToken
        };
        expectedHeaders[versionHeaderName] = versionHeaderValue;
        assert.deepEqual(args[4], expectedHeaders);
      },
      () => {
        assert.fail('Request failed unexpectedly');
      }
    );
  });
});
