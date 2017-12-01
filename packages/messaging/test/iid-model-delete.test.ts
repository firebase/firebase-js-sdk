/**
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
import IIDModel from '../src/models/iid-model';
import Errors from '../src/models/errors';

describe('Firebase Messaging > IIDModel.deleteToken()', function() {
  const fcmSenderId = '1234567';
  const fcmToken = 'qwerty';
  const fcmPushSet = '7654321';

  const sandbox = sinon.sandbox.create();
  let stubedFetch;
  let globalIIDModel;

  const fetchMock = {
    jsonOk: function() {
      var mockResponse = new window.Response(
        {},
        {
          status: 200,
          headers: {
            'Content-type': 'application/json'
          }
        }
      );
      return Promise.resolve(mockResponse);
    },
    jsonError: function(status, body) {
      const errorMsg = { error: { message: body } };
      var mockResponse = new window.Response(JSON.stringify(errorMsg), {
        status: status,
        headers: {
          'Content-type': 'application/json'
        }
      });
      return Promise.resolve(mockResponse);
    }
  };

  const cleanUp = () => {
    sandbox.restore();
    globalIIDModel = null;
  };

  before(function() {
    stubedFetch = sinon.stub(window, 'fetch');
  });

  beforeEach(function() {
    return cleanUp();
  });

  after(function() {
    stubedFetch.restore();
    return cleanUp();
  });

  it('should delete on valid request', async function() {
    globalIIDModel = new IIDModel();
    window.fetch.returns(fetchMock.jsonOk());
    await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
  });

  it('should handle fetch errors', function() {
    globalIIDModel = new IIDModel();
    const errorMsg = 'invalid token';
    window.fetch.returns(fetchMock.jsonError(400, errorMsg));
    return globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet).then(
      () => {
        throw new Error('Expected error to be thrown.');
      },
      err => {
        assert.equal(errorMsg, err.message);
      }
    );
  });
});
