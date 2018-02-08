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
import { expect } from 'chai';
import * as sinon from 'sinon';
import IIDModel from '../src/models/iid-model';
import Errors from '../src/models/errors';
import { fetchMock } from './testing-utils/mock-fetch';

describe('Firebase Messaging > IIDModel.deleteToken()', function() {
  const fcmSenderId = '1234567';
  const fcmToken = 'qwerty';
  const fcmPushSet = '7654321';

  const sandbox = sinon.sandbox.create();
  let globalIIDModel;

  const cleanUp = () => {
    sandbox.restore();
    globalIIDModel = null;
  };

  beforeEach(function() {
    return cleanUp();
  });

  after(function() {
    return cleanUp();
  });

  it('should delete on valid request', async function() {
    globalIIDModel = new IIDModel();
    let stubbedFetch = sinon.stub(window, 'fetch');
    stubbedFetch.returns(fetchMock.jsonOk(''));
    await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
    stubbedFetch.restore();
  });

  it('should handle fetch errors', async function() {
    globalIIDModel = new IIDModel();
    const errorMsg = 'invalid token';
    let stubbedFetch = sinon.stub(window, 'fetch');
    stubbedFetch.returns(fetchMock.jsonError(400, errorMsg));
    try {
      await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
      throw new Error('Expected error to be thrown.');
    } catch (e) {
      stubbedFetch.restore();
      expect(e.message).to.equal(errorMsg);
    }
    stubbedFetch.restore();
  });

  it('should handle fetch errors, HTML response returned', async function() {
    globalIIDModel = new IIDModel();
    let stubbedFetch = sinon.stub(window, 'fetch');
    stubbedFetch.returns(fetchMock.htmlError(404, 'html-response'));
    try {
      await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
      throw new Error('Expected error to be thrown.');
    } catch (e) {
      expect(e.code).to.include(Errors.codes.TOKEN_UNSUBSCRIBE_FAILED);
    }
    stubbedFetch.restore();
  });
});
