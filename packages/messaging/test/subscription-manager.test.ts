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
import { stub, restore } from 'sinon';

import { ERROR_MAP, ErrorCode } from '../src/models/errors';
import { DEFAULT_PUBLIC_VAPID_KEY } from '../src/models/fcm-details';
import { SubscriptionManager } from '../src/models/subscription-manager';

import { makeFakeSubscription } from './testing-utils/make-fake-subscription';
import { fetchMock } from './testing-utils/mock-fetch';
import { FirebaseApp } from '@firebase/app-types';
import {
  makeFakeApp,
  makeFakeInstallations
} from './testing-utils/make-fake-app';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { TokenDetails } from '../src/interfaces/token-details';
import { FirebaseInstallations } from '@firebase/installations-types';

// prettier-ignore
const appPubKey = new Uint8Array([
  255, 237, 107, 177, 171, 78, 84, 131, 221, 231, 87, 188, 22, 232, 71, 15
]);

/** Creates a new Uint8Array every time */
function getDefaultPublicKey(): Uint8Array {
  return new Uint8Array(DEFAULT_PUBLIC_VAPID_KEY);
}

describe('Firebase Messaging > SubscriptionManager', () => {
  let app: FirebaseApp;
  let installations: FirebaseInstallations;
  let subscription: PushSubscription;
  let tokenDetails: TokenDetails;
  let subscriptionManager: SubscriptionManager;

  beforeEach(() => {
    app = makeFakeApp();
    installations = makeFakeInstallations();
    subscription = makeFakeSubscription();
    tokenDetails = {
      swScope: '/example-scope',
      vapidKey: base64ToArrayBuffer(
        'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
      ),
      fcmSenderId: app.options.messagingSenderId!,
      fcmToken: 'qwerty',
      endpoint: subscription.endpoint,
      auth: subscription.getKey('auth')!,
      p256dh: subscription.getKey('p256dh')!,
      createTime: Date.now()
    };
    subscriptionManager = new SubscriptionManager();
  });

  afterEach(() => {
    restore();
  });

  describe('getToken', () => {
    it('gets token on valid request with custom VAPID key', async () => {
      const mockResponse = {
        token: tokenDetails.fcmToken
      };
      const fetchStub = stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockResponse))
      );
      const token = await subscriptionManager.getToken(
        app,
        installations,
        subscription,
        appPubKey
      );
      expect(token).to.equal(tokenDetails.fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).to.include('applicationPubKey');
    });

    it('gets token on valid request with default VAPID key', async () => {
      const mockResponse = {
        token: tokenDetails.fcmToken
      };
      const fetchStub = stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockResponse))
      );
      const token = await subscriptionManager.getToken(
        app,
        installations,
        subscription,
        getDefaultPublicKey()
      );
      expect(token).to.equal(tokenDetails.fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).not.to.include(
        'applicationPubKey'
      );
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';
      stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));
      try {
        await subscriptionManager.getToken(
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.message).to.include(errorMsg);
      }
    });

    it('handles fetch errors, HTML response returned', async () => {
      stub(window, 'fetch').returns(fetchMock.htmlError(400, 'html-response'));
      try {
        await subscriptionManager.getToken(
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_SUBSCRIBE_FAILED);
      }
    });

    it('handles invalid fetch response, no FCM token returned', async () => {
      const mockInvalidResponse = {};
      stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockInvalidResponse))
      );
      try {
        await subscriptionManager.getToken(
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.message).to.include(
          ERROR_MAP[ErrorCode.TOKEN_SUBSCRIBE_NO_TOKEN]
        );
      }
    });
  });

  describe('updateToken', () => {
    it('updates on valid request with custom VAPID key', async () => {
      const mockResponse = { token: tokenDetails.fcmToken };
      const fetchStub = stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockResponse))
      );
      const res = await subscriptionManager.updateToken(
        tokenDetails,
        app,
        installations,
        subscription,
        appPubKey
      );
      expect(res).to.equal(tokenDetails.fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).to.include('applicationPubKey');
    });

    it('updates on valid request with default VAPID key', async () => {
      const mockResponse = { token: tokenDetails.fcmToken };
      const fetchStub = stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockResponse))
      );
      const res = await subscriptionManager.updateToken(
        tokenDetails,
        app,
        installations,
        subscription,
        getDefaultPublicKey()
      );
      expect(res).to.equal(tokenDetails.fcmToken);
      expect(fetchStub.lastCall.args[1]!.body).not.to.include(
        'applicationPubKey'
      );
    });

    it('handles invalid fetch response, no FCM token returned', async () => {
      const mockInvalidResponse = {};
      stub(window, 'fetch').returns(
        fetchMock.jsonOk(JSON.stringify(mockInvalidResponse))
      );
      try {
        await subscriptionManager.updateToken(
          tokenDetails,
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_UPDATE_NO_TOKEN);
      }
    });

    it('handles invalid fetch response, HTML reponse returned', async () => {
      stub(window, 'fetch').returns(fetchMock.htmlError(404, 'html-response'));
      try {
        await subscriptionManager.updateToken(
          tokenDetails,
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_UPDATE_FAILED);
      }
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';
      stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));
      try {
        await subscriptionManager.updateToken(
          tokenDetails,
          app,
          installations,
          subscription,
          appPubKey
        );
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_UPDATE_FAILED);
      }
    });
  });

  describe('deleteToken', () => {
    it('deletes on valid request', async () => {
      stub(window, 'fetch').returns(fetchMock.jsonOk('{}'));
      await subscriptionManager.deleteToken(app, installations, tokenDetails);
    });

    it('handles fetch errors', async () => {
      const errorMsg = 'invalid token';

      stub(window, 'fetch').returns(fetchMock.jsonError(400, errorMsg));

      try {
        await subscriptionManager.deleteToken(app, installations, tokenDetails);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED);
      }
    });

    it('handles fetch errors, HTML response returned', async () => {
      const stubbedFetch = stub(window, 'fetch');
      stubbedFetch.returns(fetchMock.htmlError(404, 'html-response'));
      try {
        await subscriptionManager.deleteToken(app, installations, tokenDetails);
        throw new Error('Expected error to be thrown.');
      } catch (e) {
        expect(e.code).to.include(ErrorCode.TOKEN_UNSUBSCRIBE_FAILED);
      }
    });
  });
});
