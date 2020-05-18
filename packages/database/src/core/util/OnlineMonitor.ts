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

import { assert, isMobileCordova } from '@firebase/util';
import { EventEmitter } from './EventEmitter';

/**
 * Monitors online state (as reported by window.online/offline events).
 *
 * The expectation is that this could have many false positives (thinks we are online
 * when we're not), but no false negatives.  So we can safely use it to determine when
 * we definitely cannot reach the internet.
 *
 * @extends {EventEmitter}
 */
export class OnlineMonitor extends EventEmitter {
  private online_ = true;

  static getInstance() {
    return new OnlineMonitor();
  }

  constructor() {
    super(['online']);

    // We've had repeated complaints that Cordova apps can get stuck "offline", e.g.
    // https://forum.ionicframework.com/t/firebase-connection-is-lost-and-never-come-back/43810
    // It would seem that the 'online' event does not always fire consistently. So we disable it
    // for Cordova.
    if (
      typeof window !== 'undefined' &&
      typeof window.addEventListener !== 'undefined' &&
      !isMobileCordova()
    ) {
      window.addEventListener(
        'online',
        () => {
          if (!this.online_) {
            this.online_ = true;
            this.trigger('online', true);
          }
        },
        false
      );

      window.addEventListener(
        'offline',
        () => {
          if (this.online_) {
            this.online_ = false;
            this.trigger('online', false);
          }
        },
        false
      );
    }
  }

  /**
   * @param {!string} eventType
   * @return {Array.<boolean>}
   */
  getInitialEvent(eventType: string): boolean[] {
    assert(eventType === 'online', 'Unknown event type: ' + eventType);
    return [this.online_];
  }

  /**
   * @return {boolean}
   */
  currentlyOnline(): boolean {
    return this.online_;
  }
}
