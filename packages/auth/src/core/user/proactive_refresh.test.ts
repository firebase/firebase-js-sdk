/**
 * @license
 * Copyright 2026 Google LLC
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

import { testAuth, testUser } from '../../../test/helpers/mock_auth';
import { UserInternal } from '../../model/user';
import { AuthErrorCode } from '../errors';
import { _createError } from '../util/assert';
import { Duration, ProactiveRefresh } from './proactive_refresh';
import { MockInstance } from 'vitest';

describe('core/user/proactive_refresh', () => {
  let user: UserInternal;
  let proactiveRefresh: ProactiveRefresh;
  let getTokenStub: MockInstance;

  // Sets the expiration time in accordance with the offset in proactive refresh
  // This translates to the interval between updates
  function setExpirationTime(offset: number): void {
    user.stsTokenManager.expirationTime = Duration.OFFSET + offset;
  }

  // Advances to the next timer and returns the current fake timestamp
  async function nextTimer(): Promise<number> {
    vi.advanceTimersToNextTimer();
    await Promise.resolve();
    await Promise.resolve();
    return Date.now();
  }

  // Advances to the next timer and returns the amount of time *for that one
  // timeout* rather than the time since the epoch
  async function nextAsync(): Promise<number> {
    const now = Date.now();
    return (await nextTimer()) - now;
  }

  beforeEach(async () => {
    const auth = await testAuth();
    user = testUser(auth, 'uid');

    proactiveRefresh = new ProactiveRefresh(user);
    getTokenStub = vi
      .spyOn(user, 'getIdToken')
      .mockReturnValue(Promise.resolve('foo'));

    vi.useFakeTimers({
      now: 0,
      shouldAdvanceTime: false
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('calls getToken at regular intervals', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    expect(await nextTimer()).toBe(1000);
    expect(await nextTimer()).toBe(1000);
    expect(await nextTimer()).toBe(1000);
    expect(getTokenStub.mock.calls.length).toBe(3);
  });

  it('stops getting token when _stop is called', async () => {
    setExpirationTime(1000);
    proactiveRefresh._start();
    await nextTimer();
    proactiveRefresh._stop();
    await nextTimer();
    await nextTimer();
    await nextTimer();
    expect(getTokenStub.mock.calls.length).toBe(1);
  });

  it('stops getting token when a non-network error occurs', async () => {
    setExpirationTime(1000);
    getTokenStub.mockImplementation(() => Promise.reject(new Error('no')));
    proactiveRefresh._start();
    await nextTimer();
    await nextTimer();
    await nextTimer();
    expect(getTokenStub.mock.calls.length).toBe(1);
  });

  describe('error backoff', () => {
    const error = _createError(AuthErrorCode.NETWORK_REQUEST_FAILED, {
      appName: 'app'
    });
    beforeEach(() => {
      getTokenStub.mockImplementation(() => Promise.reject(error));
    });

    it('schedules a backoff when a network error occurs', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).toBe(1000);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN);
    });

    it('backoff continues to increase until the max', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).toBe(1000);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 4);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 8);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 16);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 32);
    });

    it('backoff resets after one success', async () => {
      setExpirationTime(1000);
      proactiveRefresh._start();
      expect(await nextAsync()).toBe(1000);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 4);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 8);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 16);
      setExpirationTime(1000 + Date.now() + Duration.RETRY_BACKOFF_MIN * 32);
      getTokenStub.mockImplementation(() => Promise.resolve());
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 32);
      expect(await nextAsync()).toBe(1000);
      getTokenStub.mockImplementation(() => Promise.reject(error));
      await nextAsync();
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 2);
      expect(await nextAsync()).toBe(Duration.RETRY_BACKOFF_MIN * 4);
    });
  });
});
