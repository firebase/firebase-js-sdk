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

import * as sinon from 'sinon';

interface TimerTripFn {
  (): void;
}

export interface TimerMap {
  [key: number]: TimerTripFn;
}

/**
 * Stubs window.setTimeout and returns a map of the functions that were passed
 * in (the map is mutable and will be modified as setTimeout gets called).
 * You can use this to manually cause timers to trip. The map is keyed by the
 * duration of the timeout
 */
export function stubTimeouts(ids?: number[]): TimerMap {
  const callbacks: { [key: number]: TimerTripFn } = {};
  let idCounter = 0;

  sinon.stub(window, 'setTimeout').callsFake((cb: () => void, duration) => {
    callbacks[duration] = cb;
    // For some bizarre reason setTimeout always get shoehorned into NodeJS.Timeout,
    // which is flat-wrong. This is the easiest way to fix it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = ids ? ids[idCounter] : idCounter + 100;
    idCounter++;
    return id as any;
  });

  return callbacks;
}

/**
 * Similar to stubTimeouts, but for use when there's only one timeout you
 * care about
 */
export function stubSingleTimeout(id?: number): TimerTripFn {
  const callbacks = stubTimeouts(id ? [id] : undefined);
  return () => {
    const [key, ...rest] = Object.keys(callbacks).map(Number);
    if (rest.length) {
      throw new Error(
        'stubSingleTimeout should only be used when a single timeout is set'
      );
    }

    callbacks[key]();
  };
}