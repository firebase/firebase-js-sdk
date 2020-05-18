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

import { assert } from '@firebase/util';

/**
 * Base class to be used if you want to emit events. Call the constructor with
 * the set of allowed event names.
 */
export abstract class EventEmitter {
  private listeners_: {
    [eventType: string]: Array<{
      callback(...args: unknown[]): void;
      context: unknown;
    }>;
  } = {};

  /**
   * @param {!Array.<string>} allowedEvents_
   */
  constructor(private allowedEvents_: string[]) {
    assert(
      Array.isArray(allowedEvents_) && allowedEvents_.length > 0,
      'Requires a non-empty array'
    );
  }

  /**
   * To be overridden by derived classes in order to fire an initial event when
   * somebody subscribes for data.
   *
   * @param {!string} eventType
   * @return {Array.<*>} Array of parameters to trigger initial event with.
   */
  abstract getInitialEvent(eventType: string): unknown[];

  /**
   * To be called by derived classes to trigger events.
   * @param {!string} eventType
   * @param {...*} varArgs
   */
  protected trigger(eventType: string, ...varArgs: unknown[]) {
    if (Array.isArray(this.listeners_[eventType])) {
      // Clone the list, since callbacks could add/remove listeners.
      const listeners = [...this.listeners_[eventType]];

      for (let i = 0; i < listeners.length; i++) {
        listeners[i].callback.apply(listeners[i].context, varArgs);
      }
    }
  }

  on(eventType: string, callback: (a: unknown) => void, context: unknown) {
    this.validateEventType_(eventType);
    this.listeners_[eventType] = this.listeners_[eventType] || [];
    this.listeners_[eventType].push({ callback, context });

    const eventData = this.getInitialEvent(eventType);
    if (eventData) {
      callback.apply(context, eventData);
    }
  }

  off(eventType: string, callback: (a: unknown) => void, context: unknown) {
    this.validateEventType_(eventType);
    const listeners = this.listeners_[eventType] || [];
    for (let i = 0; i < listeners.length; i++) {
      if (
        listeners[i].callback === callback &&
        (!context || context === listeners[i].context)
      ) {
        listeners.splice(i, 1);
        return;
      }
    }
  }

  private validateEventType_(eventType: string) {
    assert(
      this.allowedEvents_.find(et => {
        return et === eventType;
      }),
      'Unknown event: ' + eventType
    );
  }
}
