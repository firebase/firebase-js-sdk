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

import { FirestoreError, firestoreToContextualError, OperationType } from './error';
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
  protected muted = false;

  constructor(protected observer: Partial<Observer<T>>) {}

  next(value: T): void {
    if (this.muted) {
      return;
    }
    if (this.observer.next) {
      this.scheduleEvent(this.observer.next, value);
    }
  }

  error(error: FirestoreError): void {
    if (this.muted) {
      return;
    }
    if (this.observer.error) {
      this.scheduleEvent(this.observer.error, error);
    } else {
      logError('Uncaught Error in snapshot listener:', error.toString());
    }
  }

  mute(): void {
    this.muted = true;
  }

  protected scheduleEvent<E>(eventHandler: EventHandler<E>, event: E): void {
    setTimeout(() => {
      if (!this.muted) {
        eventHandler(event);
      }
    }, 0);
  }
}

export class ContextualErrorObserver<T> extends AsyncObserver<T> {
  constructor(
    observer: Partial<Observer<T>>,
    readonly path: string,
    readonly operationType: OperationType
  ) {
    super(observer);
  }

  error(error: FirestoreError): void {
    if (this.muted) {
      return;
    }
    const errorWithPath = firestoreToContextualError(error, this.path, this.operationType, true) as FirestoreError;
    if (this.observer.error) {
      // TODO: Copy stack
      this.scheduleEvent(this.observer.error, errorWithPath);
    } else {
      logError('Uncaught Error in snapshot listener:', errorWithPath.toString());
    }
  }
}
