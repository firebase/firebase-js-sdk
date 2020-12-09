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

import { expect } from 'chai';
import * as sinon from 'sinon';
import { Storage, ThrottleMetadata } from '../../src/storage/storage';
import {
  RemoteConfigFetchClient,
  FetchRequest,
  FetchResponse,
  RemoteConfigAbortSignal
} from '../../src/client/remote_config_fetch_client';
import {
  setAbortableTimeout,
  RetryingClient
} from '../../src/client/retrying_client';
import { ErrorCode, ERROR_FACTORY } from '../../src/errors';
import '../setup';

const DEFAULT_REQUEST: FetchRequest = {
  cacheMaxAgeMillis: 1,
  signal: new RemoteConfigAbortSignal()
};

describe('RetryingClient', () => {
  let backingClient: RemoteConfigFetchClient;
  let storage: Storage;
  let retryingClient: RetryingClient;
  let abortSignal: RemoteConfigAbortSignal;

  beforeEach(() => {
    backingClient = {} as RemoteConfigFetchClient;
    storage = {} as Storage;
    retryingClient = new RetryingClient(backingClient, storage);
    storage.getThrottleMetadata = sinon.stub().returns(Promise.resolve());
    storage.deleteThrottleMetadata = sinon.stub().returns(Promise.resolve());
    storage.setThrottleMetadata = sinon.stub().returns(Promise.resolve());
    backingClient.fetch = sinon
      .stub()
      .returns(Promise.resolve({ status: 200 }));
    abortSignal = new RemoteConfigAbortSignal();
  });

  describe('setAbortableTimeout', () => {
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      // Sets Date.now() to zero.
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
    });

    it('Derives backoff from end time', async () => {
      const setTimeoutSpy = sinon.spy(window, 'setTimeout');

      const timeoutPromise = setAbortableTimeout(abortSignal, Date.now() + 1);

      // Advances mocked clock so setTimeout logic runs.
      clock.runAll();

      await timeoutPromise;

      expect(setTimeoutSpy).to.have.been.calledWith(sinon.match.any, 1);
    });

    it('Normalizes end time in the past to zero backoff', async () => {
      const setTimeoutSpy = sinon.spy(window, 'setTimeout');

      const timeoutPromise = setAbortableTimeout(abortSignal, Date.now() - 1);

      // Advances mocked clock so setTimeout logic runs.
      clock.runAll();

      await timeoutPromise;

      expect(setTimeoutSpy).to.have.been.calledWith(sinon.match.any, 0);

      setTimeoutSpy.restore();
    });

    it('listens for abort event and rejects promise', async () => {
      const throttleEndTimeMillis = 1000;

      const timeoutPromise = setAbortableTimeout(
        abortSignal,
        throttleEndTimeMillis
      );

      abortSignal.abort();

      const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_THROTTLE, {
        throttleEndTimeMillis
      });

      await expect(timeoutPromise).to.eventually.be.rejectedWith(
        expectedError.message
      );
    });
  });

  describe('fetch', () => {
    it('returns success response', async () => {
      const setTimeoutSpy = sinon.spy(window, 'setTimeout');

      const expectedResponse: FetchResponse = {
        status: 200,
        eTag: 'etag',
        config: {}
      };
      backingClient.fetch = sinon
        .stub()
        .returns(Promise.resolve(expectedResponse));

      const actualResponse = retryingClient.fetch(DEFAULT_REQUEST);

      await expect(actualResponse).to.eventually.deep.eq(expectedResponse);

      // Asserts setTimeout is passed a zero delay, since throttleEndTimeMillis is set to Date.now,
      // which is faked to be a constant.
      expect(setTimeoutSpy).to.have.been.calledWith(sinon.match.any, 0);

      expect(storage.deleteThrottleMetadata).to.have.been.called;

      setTimeoutSpy.restore();
    });

    it('rethrows unretriable errors rather than retrying', async () => {
      const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
        httpStatus: 400
      });
      backingClient.fetch = sinon.stub().returns(Promise.reject(expectedError));

      const fetchPromise = retryingClient.fetch(DEFAULT_REQUEST);

      await expect(fetchPromise).to.eventually.be.rejectedWith(expectedError);
    });

    it('retries on retriable errors', async () => {
      // Configures Date.now() to advance clock from zero in 20ms increments, enabling
      // tests to assert a known throttle end time and allow setTimeout to work.
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true });

      // Ensures backoff is always zero, which simplifies reasoning about timer.
      const powSpy = sinon.stub(Math, 'pow').returns(0);
      const randomSpy = sinon.stub(Math, 'random').returns(0.5);

      // Simulates a service call that returns errors several times before returning success.
      // Error codes from logs.
      const errorResponseStatuses = [429, 500, 503, 504];
      const errorResponseCount = errorResponseStatuses.length;

      backingClient.fetch = sinon.stub().callsFake(() => {
        const httpStatus = errorResponseStatuses.pop();

        if (httpStatus) {
          // Triggers retry by returning a retriable status code.
          const expectedError = ERROR_FACTORY.create(ErrorCode.FETCH_STATUS, {
            httpStatus
          });
          return Promise.reject(expectedError);
        }

        // Halts retrying by returning success.
        // Note backoff never terminates if the server always errors.
        return Promise.resolve({ status: 200 });
      });

      await retryingClient.fetch(DEFAULT_REQUEST);

      // Asserts throttle metadata was persisted after each error response.
      for (let i = 1; i <= errorResponseCount; i++) {
        expect(storage.setThrottleMetadata).to.have.been.calledWith({
          backoffCount: i,
          throttleEndTimeMillis: i * 20
        });
      }

      powSpy.restore();
      randomSpy.restore();
      clock.restore();
    });
  });

  describe('attemptFetch', () => {
    it('honors metadata when initializing', async () => {
      const clock = sinon.useFakeTimers({ shouldAdvanceTime: true });
      const setTimeoutSpy = sinon.spy(window, 'setTimeout');

      const throttleMetadata = {
        throttleEndTimeMillis: 123
      } as ThrottleMetadata;

      await retryingClient.attemptFetch(DEFAULT_REQUEST, throttleMetadata);

      expect(setTimeoutSpy).to.have.been.calledWith(sinon.match.any, 123);

      clock.restore();
      setTimeoutSpy.restore();
    });
  });
});
