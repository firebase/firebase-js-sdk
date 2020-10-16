/**
 * @license
 * Copyright 2020 Google LLC
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

import { expect, use } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { User } from '../../model/user';
import { AUTH_ERROR_FACTORY, AuthErrorCode } from '../errors';
import {
  _OFFSET_DURATION,
  _RETRY_BACKOFF_MIN,
  ProactiveRefresh
} from './proactive_refresh';

use(chaiAsPromised);
use(sinonChai);

describe('core/user/proactive_refresh', () => {
  let user: User;
  let proactiveRefresh: ProactiveRefresh;
  let getTokenStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  // Sets the expiration time in accordance with the offset in proactive refresh
  // This translates to the interval between updates
  function setExpirationTime(offset: number): void {
    user.stsTokenManager.expirationTime = _OFFSET_DURATION + offset;
  }

  // clock.nextAsync() returns the number of milliseconds since the unix epoch.
  // We have set "now" to be the epoch. This function is like clock.nextAsync
  // except that it returns the amount of time *for that one timeout* rather
  // than the time since the epoch
  async function nextAsync(): Promise<number> {
    const now = Date.now();
    const timeoutTime = (await clock.nextAsync()) - now;
    return timeoutTime;
  }

  beforeEach(async () => {
    const auth = await testAuth();
    user = testUser(auth, 'uid');

    proactiveRefresh = new ProactiveRefresh(user);
    getTokenStub = sinon
      .stub(user, 'getIdToken')
      .returns(Promise.resolve('foo'));

    clock = sinon.useFakeTimers({
      now: 0,
      shouldAdvanceTime: false
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('calls getToken at regular intervals', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    expect(await clock.nextAsync()).to.eq(1000);
    expect(await clock.nextAsync()).to.eq(1000);
    expect(await clock.nextAsync()).to.eq(1000);
    expect(getTokenStub.getCalls().length).to.eq(3);
  });

  it('stops getting token when _stop is called', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    await clock.nextAsync();
    proactiveRefresh._stop();
    await clock.nextAsync();
    await clock.nextAsync();
    await clock.nextAsync();
    expect(getTokenStub.getCalls().length).to.eq(1);
  });

  it('stops getting token when a non-network error occurs', async () => {
    setExpirationTime(1000);
    getTokenStub.callsFake(() => Promise.reject(new Error('no')));
    proactiveRefresh._start();
    await clock.nextAsync();
    await clock.nextAsync();
    await clock.nextAsync();
    expect(getTokenStub.getCalls().length).to.eq(1);
  });

  context('error backoff', () => {
    const error = AUTH_ERROR_FACTORY.create(
      AuthErrorCode.NETWORK_REQUEST_FAILED,
      { appName: 'app' }
    );
    beforeEach(() => {
      getTokenStub.callsFake(() => Promise.reject(error));
    });

    it('schedules a backoff when a network error occurs', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).to.eq(1000);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN);
    });

    it('backoff continues to increase until the max', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).to.eq(1000);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 4);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 8);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 16);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 32);
    });

    it('backoff resets after one success', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).to.eq(1000);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 4);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 8);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 16);
      setExpirationTime(1000 + Date.now() + _RETRY_BACKOFF_MIN * 32);
      getTokenStub.callsFake(() => Promise.resolve());
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).to.eq(1000);
      getTokenStub.callsFake(() => Promise.reject(error));
      await nextAsync();
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).to.eq(_RETRY_BACKOFF_MIN * 4);
    });
  });
});
