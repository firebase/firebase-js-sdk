/**
 * @license
 * Copyright 2019 Google LLC
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

import '../testing/setup';
import { spy, stub, useFakeTimers } from 'sinon';
import { getToken, deleteToken } from './token-management';
import { FirebaseInternalDependencies } from '../interfaces/internal-dependencies';
import { getFakeFirebaseDependencies } from '../testing/fakes/firebase-dependencies';
import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { DEFAULT_VAPID_KEY } from '../util/constants';
import { expect } from 'chai';
import { ErrorCode } from '../util/errors';
import { dbGet, dbSet } from '../helpers/idb-manager';
import * as apiModule from './api';
import { Stub } from '../testing/sinon-types';
import { getFakeTokenDetails } from '../testing/fakes/token-details';
import { TokenDetails, SubscriptionOptions } from '../interfaces/token-details';
import { arrayToBase64 } from '../helpers/array-base64-translator';

describe('Token Management', () => {
  let tokenDetails: TokenDetails;
  let firebaseDependencies: FirebaseInternalDependencies;
  let swRegistration: FakeServiceWorkerRegistration;
  let requestGetTokenStub: Stub<typeof apiModule['requestGetToken']>;
  let requestUpdateTokenStub: Stub<typeof apiModule['requestUpdateToken']>;
  let requestDeleteTokenStub: Stub<typeof apiModule['requestDeleteToken']>;

  beforeEach(() => {
    useFakeTimers({ now: 1234567890 });

    tokenDetails = getFakeTokenDetails();
    firebaseDependencies = getFakeFirebaseDependencies();
    swRegistration = new FakeServiceWorkerRegistration();

    requestGetTokenStub = stub(apiModule, 'requestGetToken').resolves(
      'token-from-server' // new token.
    );
    requestUpdateTokenStub = stub(apiModule, 'requestUpdateToken').resolves(
      tokenDetails.token // same as current token.
    );
    requestDeleteTokenStub = stub(apiModule, 'requestDeleteToken').resolves();
  });

  describe('getToken', () => {
    it("throws if notification permission isn't granted", async () => {
      stub(Notification, 'permission').value('denied');

      try {
        await getToken(firebaseDependencies, swRegistration, DEFAULT_VAPID_KEY);
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).to.equal(`messaging/${ErrorCode.PERMISSION_BLOCKED}`);
      }

      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;
    });

    it('gets a new token if there is none', async () => {
      stub(Notification, 'permission').value('granted');

      const token = await getToken(
        firebaseDependencies,
        swRegistration,
        tokenDetails.subscriptionOptions!.vapidKey
      );

      expect(token).to.equal('token-from-server');
      expect(requestGetTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        tokenDetails.subscriptionOptions
      );
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal({
        ...tokenDetails,
        token: 'token-from-server'
      });
    });

    it('deletes the token and requests a new one if the token is invalid', async () => {
      stub(Notification, 'permission').value('granted');

      await dbSet(firebaseDependencies, tokenDetails);

      // Change the auth in the Push subscription, invalidating the token.
      const subscription = await swRegistration.pushManager.subscribe();
      subscription.auth = 'different-auth';
      const newAuth = arrayToBase64(subscription.getKey('auth'));

      const token = await getToken(
        firebaseDependencies,
        swRegistration,
        tokenDetails.subscriptionOptions!.vapidKey
      );

      const expectedSubscriptionOptions: SubscriptionOptions = {
        ...tokenDetails.subscriptionOptions!,
        auth: newAuth
      };

      expect(token).to.equal('token-from-server');
      expect(requestGetTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        expectedSubscriptionOptions
      );
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        tokenDetails.token
      );

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal({
        ...tokenDetails,
        token,
        subscriptionOptions: expectedSubscriptionOptions
      });
    });

    it('deletes the token and requests a new one if the VAPID key changes', async () => {
      stub(Notification, 'permission').value('granted');

      await dbSet(firebaseDependencies, tokenDetails);

      const token = await getToken(
        firebaseDependencies,
        swRegistration,
        'some-other-vapid-key'
      );

      const expectedSubscriptionOptions: SubscriptionOptions = {
        ...tokenDetails.subscriptionOptions!,
        vapidKey: 'some-other-vapid-key'
      };

      expect(token).to.equal('token-from-server');
      expect(requestGetTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        expectedSubscriptionOptions
      );
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        tokenDetails.token
      );

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal({
        ...tokenDetails,
        token,
        subscriptionOptions: expectedSubscriptionOptions
      });
    });

    it('updates the token if it was last updated more than a week ago', async () => {
      stub(Notification, 'permission').value('granted');

      // Change create time to be older than a week.
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days

      await dbSet(firebaseDependencies, tokenDetails);

      const token = await getToken(
        firebaseDependencies,
        swRegistration,
        tokenDetails.subscriptionOptions!.vapidKey
      );
      const expectedTokenDetails: TokenDetails = {
        ...tokenDetails,
        createTime: Date.now()
      };

      expect(token).to.equal(tokenDetails.token); // Same token.
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        expectedTokenDetails
      );
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal(expectedTokenDetails);
    });

    it('deletes the token if the update fails', async () => {
      stub(Notification, 'permission').value('granted');

      // Change create time to be older than a week.
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days

      await dbSet(firebaseDependencies, tokenDetails);

      requestUpdateTokenStub.rejects(new Error('Update failed.'));

      await expect(
        getToken(
          firebaseDependencies,
          swRegistration,
          tokenDetails.subscriptionOptions!.vapidKey
        )
      ).to.be.rejectedWith('Update failed.');

      const expectedTokenDetails: TokenDetails = {
        ...tokenDetails,
        createTime: Date.now()
      };

      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        expectedTokenDetails
      );
      expect(requestDeleteTokenStub).to.have.been.calledOnceWith(
        firebaseDependencies,
        tokenDetails.token
      );

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(tokenFromDb).to.be.undefined;
    });

    it('returns the token if it is valid', async () => {
      stub(Notification, 'permission').value('granted');

      await dbSet(firebaseDependencies, tokenDetails);

      const token = await getToken(
        firebaseDependencies,
        swRegistration,
        tokenDetails.subscriptionOptions!.vapidKey
      );

      expect(token).to.equal(tokenDetails.token);
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(firebaseDependencies);
      expect(tokenFromDb).to.deep.equal(tokenDetails);
    });
  });

  describe('deleteToken', () => {
    it('returns if there is no token in the db', async () => {
      await deleteToken(firebaseDependencies, swRegistration);

      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;
    });

    it('removes token from the db, calls requestDeleteToken and unsubscribes the push subscription', async () => {
      const unsubscribeSpy = spy(
        await swRegistration.pushManager.subscribe(),
        'unsubscribe'
      );
      await dbSet(firebaseDependencies, tokenDetails);

      await deleteToken(firebaseDependencies, swRegistration);

      expect(await dbGet(firebaseDependencies)).to.be.undefined;
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.calledOnceWith(
        firebaseDependencies,
        tokenDetails
      );
      expect(unsubscribeSpy).to.have.been.called;
    });
  });
});
