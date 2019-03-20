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
import { expect } from 'chai';
import * as sinon from 'sinon';

import { ERROR_CODES, ERROR_MAP } from '../src/models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { IidModel } from '../src/models/iid-model';

import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { fetchMock } from './testing-utils/mock-fetch';

import { describe } from './testing-utils/messaging-test-runner';

const fcmSenderId = '1234567';
const fcmToken = 'qwerty';
const fcmPushSet = '7654321';
let subscription: PushSubscription;
// prettier-ignore
const appPubKey = new Uint8Array([
  255, 237, 107, 177, 171, 78, 84, 131, 221, 231, 87, 188, 22, 232, 71, 15
]);

/** Creates a new Uint8Array every time */
function getDefaultPublicKey(): Uint8Array {
  return new Uint8Array(DEFAULT_PUBLIC_VAPID_KEY);
}

describe('Firebase Messaging > IidModel', () => {
  let sandbox: sinon.SinonSandbox;
  let iidModel: IidModel;

  before(() => {
    subscription = makeFakeSubscription();
  });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    iidModel = new IidModel();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getToken', () => {
    it('gets token on valid request with custom VAPID key', async () => {
      const mockResponse = {
        token: fcmToken,
        pushSet: fcmPushSet
      };
      const fetchStub = sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockResponse)));
      const res = await iidModel.getToken(fcmSenderId, subscription, appPubKey);
      expect(res).to.deep.equal(mockResponse);
      expect(fetchStub.lastCall.args[1]!.body).to.include(
        'application_pub_key'
      );
    });

    it('gets token on valid request with default VAPID key', async () => {
      const mockResponse = {
        token: fcmToken,
        pushSet: fcmPushSet
      };
      const fetchStub = sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockResponse)));
      const res = await iidModel.getToken(
        fcmSenderId,
        subscription,
        getDefaultPublicKey()
      );
      expect(res).to.deep.equal(mockResponse);
      expect(fetchStub.lastCall.args[1]!.body).not.to.include(
        'application_pub_key'
      );
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';
      sandbox.stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));
      try {
        await iidModel.getToken(fcmSenderId, subscription, appPubKey);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.message).to.equal(errorMsg);
      }
    });

    it('handles fetch errors, HTML response returned', async () => {
      sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.htmlError(400, 'html-response'));
      try {
        await iidModel.getToken(fcmSenderId, subscription, appPubKey);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_SUBSCRIBE_FAILED);
      }
    });

    it('handles invalid fetch response, no FCM token returned', async () => {
      const mockInvalidResponse = {
        pushSet: fcmPushSet
      };
      sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockInvalidResponse)));
      try {
        await iidModel.getToken(fcmSenderId, subscription, appPubKey);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.message).to.include(
          ERROR_MAP[ERROR_CODES.TOKEN_SUBSCRIBE_NO_TOKEN]
        );
      }
    });

    it('handles invalid fetch response, no push set token returned', async () => {
      const mockInvalidResponse = {
        token: fcmToken
      };
      sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockInvalidResponse)));
      try {
        await iidModel.getToken(fcmSenderId, subscription, appPubKey);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_SUBSCRIBE_NO_PUSH_SET);
      }
    });
  });

  describe('updateToken', () => {
    it('updates on valid request with custom VAPID key', async () => {
      const mockResponse = { token: fcmToken };
      const fetchStub = sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockResponse)));
      const res = await iidModel.updateToken(
        fcmSenderId,
        fcmToken,
        fcmPushSet,
        subscription,
        appPubKey
      );
      expect(res).to.equal(fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).to.include(
        'application_pub_key'
      );
    });

    it('updates on valid request with default VAPID key', async () => {
      const mockResponse = { token: fcmToken };
      const fetchStub = sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockResponse)));
      const res = await iidModel.updateToken(
        fcmSenderId,
        fcmToken,
        fcmPushSet,
        subscription,
        getDefaultPublicKey()
      );
      expect(res).to.equal(fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).not.to.include(
        'application_pub_key'
      );
    });

    it('handles invalid fetch response, no FCM token returned', async () => {
      const mockInvalidResponse = {
        pushSet: fcmPushSet
      };
      sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.jsonOk(JSON.stringify(mockInvalidResponse)));
      try {
        await iidModel.updateToken(
          fcmSenderId,
          fcmToken,
          fcmPushSet,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_UPDATE_NO_TOKEN);
      }
    });

    it('handles invalid fetch response, HTML reponse returned', async () => {
      sandbox
        .stub(window, 'fetch')
        .returns(fetchMock.htmlError(404, 'html-response'));
      try {
        await iidModel.updateToken(
          fcmSenderId,
          fcmToken,
          fcmPushSet,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_UPDATE_FAILED);
      }
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';
      sandbox.stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));
      try {
        await iidModel.updateToken(
          fcmSenderId,
          fcmToken,
          fcmPushSet,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_UPDATE_FAILED);
      }
    });
  });

  describe('deleteToken', () => {
    it('deletes on valid request', async () => {
      sandbox.stub(window, 'fetch').returns(fetchMock.jsonOk('{}'));
      await iidModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';

      sandbox.stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));

      try {
        await iidModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED);
      }
    });

    it('handles fetch errors, HTML response returned', async () => {
      const stubbedFetch = sandbox.stub(window, 'fetch');
      stubbedFetch.returns(fetchMock.htmlError(404, 'html-response'));
      try {
        await iidModel.deleteToken(fcmSenderId, fcmToken, fcmPushSet);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ERROR_CODES.TOKEN_UNSUBSCRIBE_FAILED);
      }
    });
  });
});
