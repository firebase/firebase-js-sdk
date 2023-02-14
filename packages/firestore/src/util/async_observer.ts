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

import { Observer } from '../core/event_manager';

import { FirestoreError } from './error';
import { logError } from './log';
import { EventHandler } from './misc';

/*
 * A wrapper implementation of Observer<T> that will dispatch events
 * asynchronously. To allow immediate silencing, a mute call is added which
 * causes events scheduled to no longer be raised.
 */
export class AsyncObserver<T> implements Observer<T> {
  /**
   * When set to true, will not raise future events. Necessary to deal with
   * async detachment of listener.
   */
  private muted = false;

  constructor(private observer: Partial<Observer<T>>) {}

  next(value: T): void {
    if (this.observer.next) {
      this.scheduleEvent(this.observer.next, value);
    }
  }

  error(error: FirestoreError): void {
    if (this.observer.error) {
      this.scheduleEvent(this.observer.error, error);
    } else {
      logError('Uncaught Error in snapshot listener:', error.toString());
    }
  }

  mute(): void {
    this.muted = true;
  }

  private scheduleEvent<E>(eventHandler: EventHandler<E>, event: E): void {
    if (!this.muted) {
      setTimeout(() => {
        if (!this.muted) {
          eventHandler(event);
        }
      }, 0);
    }
  }
}
