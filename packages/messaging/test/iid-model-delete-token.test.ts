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
import { fetchMock } from './testing-utils/mock-fetch';

describe('Firebase Messaging > IIDModel.deleteToken()', function() {
  const fcmSenderId = '1234567';
  const fcmToken = 'qwerty';
  const fcmPushSet = '7654321';

  const sandbox = sinon.sandbox.create();
  let stubedFetch;
  let globalIIDModel;

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
    (window as any).fetch.returns(fetchMock.jsonOk(''));
    await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
  });

  it('should handle fetch errors', async function() {
    globalIIDModel = new IIDModel();
    const errorMsg = 'invalid token';
    (window as any).fetch.returns(fetchMock.jsonError(400, errorMsg));
    try {
      await globalIIDModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
      throw new Error('Expected error to be thrown.');
    } catch (e) {
      expect(e.message).to.equal(errorMsg);
    }
  });
});
