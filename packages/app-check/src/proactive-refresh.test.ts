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

import '../test/setup';
import { expect, vi } from 'vitest';
import { Deferred } from '@firebase/util';
import { Refresher } from './proactive-refresh';

describe('proactive refresh', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws if lowerbound is greater than the upperbound', () => {
    expect(
      () =>
        new Refresher(
          () => Promise.resolve(),
          () => false,
          () => 0,
          100,
          99
        )
    ).toThrow(/Proactive refresh lower bound greater than upper bound!/);
  });

  it('runs operation after wait', async () => {
    vi.useFakeTimers();
    const operations = [new Deferred(), new Deferred(), new Deferred()];
    let counter = 0;
    const waitTime = 10;
    const refresher = new Refresher(
      () => {
        const operation = operations[counter++];
        operation.resolve();
        return operation.promise;
      },
      () => false,
      () => waitTime,
      1,
      100
    );

    expect(refresher.isRunning()).toBe(false);
    refresher.start();
    expect(refresher.isRunning()).toBe(true);

    await vi.advanceTimersByTimeAsync(waitTime);
    await expect(operations[0].promise).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(waitTime);
    await expect(operations[1].promise).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(waitTime);
    await expect(operations[2].promise).resolves.toBeUndefined();

    refresher.stop();
  });

  it('retries on retriable errors', async () => {
    const waitTime = 10;
    let counter = 0;
    const successOperation = new Deferred();
    const refresher = new Refresher(
      () => {
        if (counter++ === 0) {
          return Promise.reject('Error but retriable');
        } else {
          successOperation.resolve();
          return successOperation.promise;
        }
      },
      error => (error as string).includes('Error but retriable'),
      () => waitTime,
      1,
      100
    );

    refresher.start();

    await expect(successOperation.promise).resolves.toBeUndefined();
    expect(refresher.isRunning()).toBe(true);
    refresher.stop();
  });

  it('does not retry and stop refreshing on non-retriable errors', async () => {
    const waitTime = 10;
    const retryCheck = new Deferred();
    const refresher = new Refresher(
      () => Promise.reject('non-retriable'),
      error => {
        retryCheck.resolve();
        return (error as string).includes('Error but retriable');
      },
      () => waitTime,
      1,
      100
    );

    refresher.start();

    await retryCheck.promise;
    expect(refresher.isRunning()).toBe(false);
  });

  it('backs off exponentially when retrying', async () => {
    vi.useFakeTimers();
    const minWaitTime = 10;
    const maxWaitTime = 100;
    let counter = 0;
    const operations = [new Deferred(), new Deferred()];
    const refresher = new Refresher(
      () => {
        operations[counter++].resolve();
        return Promise.reject('Error but retriable');
      },
      error => (error as string).includes('Error but retriable'),
      () => minWaitTime,
      minWaitTime,
      maxWaitTime
    );

    refresher.start();

    await vi.advanceTimersByTimeAsync(minWaitTime);

    await expect(operations[0].promise).resolves.toBeUndefined();
    await vi.advanceTimersByTimeAsync(minWaitTime * 2);
    await expect(operations[1].promise).resolves.toBeUndefined();

    refresher.stop();
  });

  it('can be stopped during wait', async () => {
    vi.useFakeTimers();
    const waitTime = 10;
    const operation = new Deferred();
    const refresher = new Refresher(
      () => {
        operation.resolve();
        return operation.promise;
      },
      _error => false,
      () => waitTime,
      10,
      100
    );

    refresher.start();
    await vi.advanceTimersByTimeAsync(0.5 * waitTime);
    refresher.stop();
    await vi.advanceTimersByTimeAsync(waitTime);

    operation.reject('not resolved');
    await expect(operation.promise).rejects.toBe('not resolved');
    expect(refresher.isRunning()).toBe(false);
  });

  it('can be restarted after being stopped', async () => {
    vi.useFakeTimers();
    const waitTime = 10;
    const operation = new Deferred();
    const operationAfterRestart = new Deferred();
    const refresher = new Refresher(
      () => {
        operation.resolve();
        operationAfterRestart.resolve();
        return operation.promise;
      },
      _error => false,
      () => waitTime,
      10,
      100
    );

    refresher.start();
    await vi.advanceTimersByTimeAsync(0.5 * waitTime);
    refresher.stop();
    await vi.advanceTimersByTimeAsync(waitTime);

    operation.reject('not resolved');
    await expect(operation.promise).rejects.toBe('not resolved');
    expect(refresher.isRunning()).toBe(false);

    refresher.start();
    await vi.advanceTimersByTimeAsync(waitTime);
    await expect(operationAfterRestart.promise).resolves.toBeUndefined();

    refresher.stop();
  });
});
