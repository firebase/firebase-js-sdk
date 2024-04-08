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

import * as apiModule from './requests';

import { dbGet, dbSet } from './idb-manager';
import { deleteTokenInternal, getTokenInternal } from './token-manager';
import {
  getFakeAnalyticsProvider,
  getFakeApp,
  getFakeInstallations
} from '../testing/fakes/firebase-dependencies';
import { spy, stub, useFakeTimers } from 'sinon';

import { FakeServiceWorkerRegistration } from '../testing/fakes/service-worker';
import { MessagingService } from '../messaging-service';
import { Stub } from '../testing/sinon-types';
import { TokenDetails } from '../interfaces/token-details';
// import { arrayToBase64 } from '../helpers/array-base64-translator';
import { expect } from 'chai';
import { getFakeTokenDetails } from '../testing/fakes/token-details';

describe('Token Manager', () => {
  let tokenDetails: TokenDetails;
  let messaging: MessagingService;
  let requestGetTokenStub: Stub<(typeof apiModule)['requestGetToken']>;
  let requestUpdateTokenStub: Stub<(typeof apiModule)['requestUpdateToken']>;
  let requestDeleteTokenStub: Stub<(typeof apiModule)['requestDeleteToken']>;

  beforeEach(() => {
    tokenDetails = getFakeTokenDetails();
    messaging = new MessagingService(
      getFakeApp(),
      getFakeInstallations(),
      getFakeAnalyticsProvider()
    );
    // base64 value of 'vapid-key-value' set in fakeTokenDetails
    messaging.vapidKey = 'dmFwaWQta2V5LXZhbHVl';
    messaging.swRegistration = new FakeServiceWorkerRegistration();

    requestGetTokenStub = stub(apiModule, 'requestGetToken').resolves(
      'token-value' // new token.
    );
    requestUpdateTokenStub = stub(apiModule, 'requestUpdateToken').resolves(
      tokenDetails.token // same as current token.
    );
    requestDeleteTokenStub = stub(apiModule, 'requestDeleteToken').resolves();
    useFakeTimers({ now: 1234567890 });
  });

  describe('getTokenInternal', () => {
    it('gets a new token if there is none', async () => {
      // Act
      const token = await getTokenInternal(messaging);

      // Assert
      expect(token).to.equal('token-value');
      expect(requestGetTokenStub).to.have.been.calledOnceWith(
        messaging.firebaseDependencies,
        tokenDetails.subscriptionOptions
      );
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal({
        ...tokenDetails,
        token: 'token-value'
      });
    });

    it('returns the token if it is valid', async () => {
      // Arrange
      await dbSet(messaging.firebaseDependencies, tokenDetails);

      // Act
      const token = await getTokenInternal(messaging);

      // Assert
      expect(token).to.equal(tokenDetails.token);
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(tokenFromDb).to.deep.equal(tokenDetails);
    });

    it('update the token if it was last updated more than a week ago', async () => {
      // Change create time to be older than a week.
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days

      await dbSet(messaging.firebaseDependencies, tokenDetails);

      const token = await getTokenInternal(messaging);
      const expectedTokenDetails: TokenDetails = {
        ...tokenDetails,
        createTime: Date.now()
      };

      expect(token).to.equal(tokenDetails.token); // Same token.
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).to.have.been.calledOnceWith(
        messaging.firebaseDependencies,
        expectedTokenDetails
      );
      expect(requestDeleteTokenStub).not.to.have.been.called;

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(token).to.equal(tokenFromDb!.token);
      expect(tokenFromDb).to.deep.equal(expectedTokenDetails);
    });

    it('retains the token upon update failure due to potential server error, allowing for future update attempts', async () => {
      // Arrange
      tokenDetails.createTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago, triggering an update
      await dbSet(messaging.firebaseDependencies, tokenDetails);
      requestUpdateTokenStub.rejects(new Error('Temporary server error'));

      // Act
      await expect(getTokenInternal(messaging)).to.be.rejectedWith(
        'Temporary server error'
      );

      // Assert
      expect(requestUpdateTokenStub).to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called; // Verify delete was not called

      // Reasoning documentation
      // This test ensures that the token is not deleted upon an update failure,
      // recognizing that such failures may be temporary server-side issues.
      // By not deleting the token, we allow the system to retry the update in the future,
      // avoiding unnecessary token churn and preserving continuity for the user.

      const tokenFromDb = await dbGet(messaging.firebaseDependencies);
      expect(tokenFromDb).to.not.be.null; // Ensure the token still exists
    });
  });

  describe('deleteToken', () => {
    it('returns if there is no token in the db', async () => {
      await deleteTokenInternal(messaging);

      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.called;
    });

    it('removes token from the db, calls requestDeleteToken and unsubscribes the push subscription', async () => {
      const unsubscribeSpy = spy(
        await messaging.swRegistration!.pushManager.subscribe(),
        'unsubscribe'
      );
      await dbSet(messaging.firebaseDependencies, tokenDetails);

      await deleteTokenInternal(messaging);

      expect(await dbGet(messaging.firebaseDependencies)).to.be.undefined;
      expect(requestGetTokenStub).not.to.have.been.called;
      expect(requestUpdateTokenStub).not.to.have.been.called;
      expect(requestDeleteTokenStub).not.to.have.been.calledOnceWith(
        messaging.firebaseDependencies,
        tokenDetails
      );
      expect(unsubscribeSpy).to.have.been.called;
    });
  });
});
