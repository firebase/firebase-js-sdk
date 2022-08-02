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

import { Deferred } from '@firebase/util';

/**
 * Port from auth proactiverefresh.js
 *
 */
// TODO: move it to @firebase/util?
// TODO: allow to config whether refresh should happen in the background
export class Refresher {
  private pending: Deferred<unknown> | null = null;
  private nextErrorWaitInterval: number;
  constructor(
    private readonly operation: () => Promise<unknown>,
    private readonly retryPolicy: (error: unknown) => boolean,
    private readonly getWaitDuration: () => number,
    private readonly lowerBound: number,
    private readonly upperBound: number
  ) {
    this.nextErrorWaitInterval = lowerBound;

    if (lowerBound > upperBound) {
      throw new Error(
        'Proactive refresh lower bound greater than upper bound!'
      );
    }
  }

  start(): void {
    this.nextErrorWaitInterval = this.lowerBound;
    this.process(true).catch(() => {
      /* we don't care about the result */
    });
  }

  stop(): void {
    if (this.pending) {
      this.pending.reject('cancelled');
      this.pending = null;
    }
  }

  isRunning(): boolean {
    return !!this.pending;
  }

  private async process(hasSucceeded: boolean): Promise<void> {
    this.stop();
    try {
      this.pending = new Deferred();
      await sleep(this.getNextRun(hasSucceeded));

      // Why do we resolve a promise, then immediate wait for it?
      // We do it to make the promise chain cancellable.
      // We can call stop() which rejects the promise before the following line execute, which makes
      // the code jump to the catch block.
      // TODO: unit test this
      this.pending.resolve();
      await this.pending.promise;
      this.pending = new Deferred();
      await this.operation();

      this.pending.resolve();
      await this.pending.promise;

      this.process(true).catch(() => {
        /* we don't care about the result */
      });
    } catch (error) {
      if (this.retryPolicy(error)) {
        this.process(false).catch(() => {
          /* we don't care about the result */
        });
      } else {
        this.stop();
      }
    }
  }

  private getNextRun(hasSucceeded: boolean): number {
    if (hasSucceeded) {
      // If last operation succeeded, reset next error wait interval and return
      // the default wait duration.
      this.nextErrorWaitInterval = this.lowerBound;
      // Return typical wait duration interval after a successful operation.
      return this.getWaitDuration();
    } else {
      // Get next error wait interval.
      const currentErrorWaitInterval = this.nextErrorWaitInterval;
      // Double interval for next consecutive error.
      this.nextErrorWaitInterval *= 2;
      // Make sure next wait interval does not exceed the maximum upper bound.
      if (this.nextErrorWaitInterval > this.upperBound) {
        this.nextErrorWaitInterval = this.upperBound;
      }
      return currentErrorWaitInterval;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });
}
