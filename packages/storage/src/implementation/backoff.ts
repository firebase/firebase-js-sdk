/**
 * @license
 * Copyright 2017 Google LLC
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

import { Deferred } from '@firebase/util';

/**
 * @fileoverview Provides a method for running a function with exponential
 * backoff.
 */
type id = (p1: boolean) => void;

export { id };

type RequestOperation<T> = () => Promise<T>;

enum CancelState {
  RUNNING,
  CANCELED,
  STOPPED
}

export class ExponentialBackoff<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retryTimeoutId?: any;
  // Max time allows for the operation, including retries.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalTimeoutId?: any;
  cancelState = CancelState.RUNNING;
  private backoffDeferred = new Deferred<T>();
  private waitTimeInS = 1;
  private waitTimeInMS = 1;
  private currentOperation?: Promise<T>;
  constructor(
    private operation: RequestOperation<T>,
    private timeout: number
  ) {}
  isCanceled(): boolean {
    return this.cancelState === CancelState.CANCELED;
  }
  getPromise(): Promise<T> {
    return this.backoffDeferred.promise;
  }
  startGlobalTimeout(): void {
    this.globalTimeoutId = setTimeout(() => {
      this.clearRetryTimeout();
      if (this.cancelState === CancelState.RUNNING) {
        this.backoffDeferred.reject({ wasCanceled: false, connection: null });
        this.cancelState = CancelState.STOPPED;
      }
    }, this.timeout);
  }
  clearGlobalTimeout(): void {
    clearTimeout(this.globalTimeoutId);
  }
  clearRetryTimeout(): void {
    clearTimeout(this.retryTimeoutId);
  }
  // Is there a chance that we have two operations going on at the same time?
  runOperation(): void {
    this.currentOperation = this.operation();
    this.currentOperation
      .then(res => {
        if (this.cancelState === CancelState.RUNNING) {
          this.clearGlobalTimeout();
          this.backoffDeferred.resolve(res);
          this.cancelState = CancelState.STOPPED;
        }
      })
      .catch(errInfo => {
        if (errInfo.retry) {
          if (this.waitTimeInS < 64) {
            this.waitTimeInS *= 2;
          }
          this.waitTimeInMS = (this.waitTimeInS + Math.random()) * 1000;
          this.delayOperation();
        } else {
          this.clearGlobalTimeout();
          this.backoffDeferred.reject(errInfo);
        }
      });
  }
  delayOperation(): void {
    this.retryTimeoutId = setTimeout(() => {
      this.runOperation();
      this.retryTimeoutId = null;
    }, this.waitTimeInMS);
  }
  start(): void {
    this.startGlobalTimeout();
    this.runOperation();
    this.cancelState = CancelState.RUNNING;
  }
  stop(): void {
    this.clearGlobalTimeout();
    this.clearRetryTimeout();
    if (this.cancelState === CancelState.RUNNING) {
      this.backoffDeferred.reject({ wasCanceled: true, connection: null });
      this.cancelState = CancelState.STOPPED;
    }
  }
}

/**
 * Accepts a callback for an action to perform (`doRequest`),
 * and then a callback for when the backoff has completed (`backoffCompleteCb`).
 * The callback sent to start requires an argument to call (`onRequestComplete`).
 * When `start` calls `doRequest`, it passes a callback for when the request has
 * completed, `onRequestComplete`. Based on this, the backoff continues, with
 * another call to `doRequest` and the above loop continues until the timeout
 * is hit, or a successful response occurs.
 * @description
 * @param doRequest Callback to perform request
 * @param backoffCompleteCb Callback to call when backoff has been completed
 */
export function start(
  doRequest: (
    onRequestComplete: (success: boolean) => void,
    canceled: boolean
  ) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  backoffCompleteCb: (...args: any[]) => unknown,
  timeout: number
): id {
  // TODO(andysoto): make this code cleaner (probably refactor into an actual
  // type instead of a bunch of functions with state shared in the closure)
  let waitSeconds = 1;
  // Would type this as "number" but that doesn't work for Node so ¯\_(ツ)_/¯
  // TODO: find a way to exclude Node type definition for storage because storage only works in browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let retryTimeoutId: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let globalTimeoutId: any = null;
  let hitTimeout = false;
  let cancelState = 0;

  function canceled(): boolean {
    return cancelState === 2;
  }
  let triggeredCallback = false;

  function triggerCallback(...args: any[]): void {
    if (!triggeredCallback) {
      triggeredCallback = true;
      backoffCompleteCb.apply(null, args);
    }
  }

  function callWithDelay(millis: number): void {
    retryTimeoutId = setTimeout(() => {
      retryTimeoutId = null;
      doRequest(responseHandler, canceled());
    }, millis);
  }

  function clearGlobalTimeout(): void {
    if (globalTimeoutId) {
      clearTimeout(globalTimeoutId);
    }
  }

  // To be called whenever the `doRequest` is complete. Then calls the backoffComplete cb when we no longer need to backoff. AKA action is complete.
  function responseHandler(success: boolean, ...args: any[]): void {
    // Check if the callback has already been triggered, if so, then clear the global timeout.
    // Note: When would this happen?
    if (triggeredCallback) {
      clearGlobalTimeout();
      return;
    }
    const mustStop = canceled() || hitTimeout;
    // If the action was already canceled or we hit the global timeout, or the operation was successful, we need to run the callback.
    // What if the action was successful and we hit the timeout?
    // For example, if the response comes back after the global timeout, and the response was successful, we'd get a proper callback response,
    // but no error.
    if (success || mustStop) {
      clearGlobalTimeout();
      triggerCallback.call(null, success, ...args);
      return;
    }

    if (waitSeconds < 64) {
      /* TODO(andysoto): don't back off so quickly if we know we're offline. */
      waitSeconds *= 2;
    }
    let waitMillis;
    if (cancelState === 1) {
      cancelState = 2;
      waitMillis = 0;
    } else {
      waitMillis = (waitSeconds + Math.random()) * 1000;
    }
    callWithDelay(waitMillis);
  }
  let stopped = false;

  function stop(wasTimeout: boolean): void {
    if (stopped) {
      return;
    }
    stopped = true;
    clearGlobalTimeout();
    if (triggeredCallback) {
      return;
    }
    if (retryTimeoutId !== null) {
      if (!wasTimeout) {
        cancelState = 2;
      }
      clearTimeout(retryTimeoutId);
      callWithDelay(0);
    } else {
      if (!wasTimeout) {
        // Canceled because of an external stop.
        cancelState = 1;
      }
    }
  }
  callWithDelay(0);
  globalTimeoutId = setTimeout(() => {
    hitTimeout = true;
    stop(true);
  }, timeout);
  return stop;
}

/**
 * Stops the retry loop from repeating.
 * If the function is currently "in between" retries, it is invoked immediately
 * with the second parameter as "true". Otherwise, it will be invoked once more
 * after the current invocation finishes iff the current invocation would have
 * triggered another retry.
 */
export function stop(id: id): void {
  id(false);
}
