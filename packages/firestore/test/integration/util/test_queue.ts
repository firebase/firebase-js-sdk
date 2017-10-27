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
import { AsyncQueue } from '../../../src/util/async_queue';
import { Deferred } from '../../../src/util/promise';

/** The delay used by the idle timeout */
const IDLE_DISPATCH_DELAY_MS = 60.0 * 1000;

/** The maximum delay we use in a test run. */
const TEST_DISPATCH_DELAY_MS = 1.0 * 1000;

/**
 * Dispatch queue used in the integration tests that caps delayed executions at
 * 1.0 seconds.
 */
export class TestQueue extends AsyncQueue {
  idleTimeoutDeferred: Deferred<void> | null = null;

  schedule<T>(op: () => Promise<T>, delay?: number): Promise<T> {
    let interceptedOp = op;
    if (this.idleTimeoutDeferred && delay === IDLE_DISPATCH_DELAY_MS) {
      interceptedOp = () => {
        return op().then(res => {
          this.idleTimeoutDeferred.resolve();
          return Promise.resolve(res);
        });
      };
    }
    return super.schedule(
      interceptedOp,
      Math.min(delay, TEST_DISPATCH_DELAY_MS)
    );
  }

  /**
   * Executes the provided closure and waits for an idle closure to be processed
   * before resolving its Promise.
   * The client is not guaranteed to be idle when this function returns, as we
   * may have queued other operations since the timeout was first scheduled.
   */
  awaitIdleTimeout<T>(fn: () => Promise<T>): Promise<T> {
    this.idleTimeoutDeferred = new Deferred<void>();
    const res = fn();
    return this.idleTimeoutDeferred.promise.then(() => {
      return res;
    });
  }
}
