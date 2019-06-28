/**
 * @license
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

import * as firestore from '@firebase/firestore-types';
import { Deferred } from '@firebase/util';
import { expect } from 'chai';

/**
 * A helper object that can accumulate an arbitrary amount of events and resolve
 * a promise when expected number has been emitted.
 */
export class EventsAccumulator<
  T extends firestore.DocumentSnapshot | firestore.QuerySnapshot
> {
  private events: T[] = [];
  private waitingFor: number;
  private deferred: Deferred<T[]> | null = null;
  private rejectAdditionalEvents = false;

  storeEvent: (evt: T) => void = (evt: T) => {
    if (this.rejectAdditionalEvents) {
      throw new Error(
        'Additional event detected after assertNoAdditionalEvents called' +
          JSON.stringify(evt)
      );
    }
    this.events.push(evt);
    this.checkFulfilled();
  };

  awaitEvents(length: number): Promise<T[]> {
    expect(this.deferred).to.equal(null, 'Already waiting for events.');
    this.waitingFor = length;
    this.deferred = new Deferred<T[]>();
    const promise = this.deferred.promise;
    this.checkFulfilled();
    return promise;
  }

  awaitEvent(): Promise<T> {
    return this.awaitEvents(1).then(events => events[0]);
  }

  /** Waits for a latency compensated local snapshot. */
  async awaitLocalEvent(): Promise<T> {
    const snapshot = await this.awaitEvent();
    if (snapshot.metadata.hasPendingWrites) {
      return snapshot;
    } else {
      return this.awaitLocalEvent();
    }
  }

  /** Waits for multiple latency compensated local snapshot. */
  async awaitLocalEvents(count: number): Promise<T[]> {
    const results = [] as T[];
    for (let i = 0; i < count; i++) {
      results.push(await this.awaitLocalEvent());
    }
    return results;
  }

  /** Waits for a snapshot that has no pending writes */
  async awaitRemoteEvent(): Promise<T> {
    const snapshot = await this.awaitEvent();
    if (!snapshot.metadata.hasPendingWrites) {
      return snapshot;
    } else {
      return this.awaitRemoteEvent();
    }
  }

  assertNoAdditionalEvents(): Promise<void> {
    this.rejectAdditionalEvents = true;
    return new Promise((resolve: (val: void) => void, reject) => {
      setTimeout(() => {
        if (this.events.length > 0) {
          reject(
            'Received ' +
              this.events.length +
              ' events: ' +
              JSON.stringify(this.events)
          );
        } else {
          resolve(undefined);
        }
      }, 0);
    });
  }

  allowAdditionalEvents(): void {
    this.rejectAdditionalEvents = false;
  }

  private checkFulfilled(): void {
    if (this.deferred !== null && this.events.length >= this.waitingFor) {
      const events = this.events.splice(0, this.waitingFor);
      this.deferred.resolve(events);
      this.deferred = null;
    }
  }
}
