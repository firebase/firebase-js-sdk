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

/**
 * @fileoverview Provides a method for running a function with exponential
 * backoff.
 */
type id = (p1: boolean) => void;

export { id };

/**
 * @param f May be invoked
 *     before the function returns.
 * @param callback Get all the arguments passed to the function
 *     passed to f, including the initial boolean.
 */
export function start(
  f: (p1: (success: boolean) => void, canceled: boolean) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (...args: any[]) => unknown,
  timeout: number
): id {
  // TODO(andysoto): make this code cleaner (probably refactor into an actual
  // type instead of a bunch of functions with state shared in the closure)
  let waitSeconds = 1;
  // Would type this as "number" but that doesn't work for Node so ¯\_(ツ)_/¯
  // TODO: find a way to exclude Node type definition for storage because storage only works in browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timeoutId: any = null;
  let hitTimeout = false;
  let cancelState = 0;

  function canceled(): boolean {
    return cancelState === 2;
  }
  let triggeredCallback = false;

  // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
  // the no-explicit-any rule when ESlint releases it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function triggerCallback(...args: any[]): void {
    if (!triggeredCallback) {
      triggeredCallback = true;
      callback.apply(null, args);
    }
  }

  function callWithDelay(millis: number): void {
    timeoutId = setTimeout(() => {
      timeoutId = null;
      f(handler, canceled());
    }, millis);
  }

  // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
  // the no-explicit-any rule when ESlint releases it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handler(success: boolean, ...args: any[]): void {
    if (triggeredCallback) {
      return;
    }
    if (success) {
      triggerCallback.call(null, success, ...args);
      return;
    }
    const mustStop = canceled() || hitTimeout;
    if (mustStop) {
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
    if (triggeredCallback) {
      return;
    }
    if (timeoutId !== null) {
      if (!wasTimeout) {
        cancelState = 2;
      }
      clearTimeout(timeoutId);
      callWithDelay(0);
    } else {
      if (!wasTimeout) {
        cancelState = 1;
      }
    }
  }
  callWithDelay(0);
  setTimeout(() => {
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
