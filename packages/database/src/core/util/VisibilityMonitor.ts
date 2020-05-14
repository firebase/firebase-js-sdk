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

import { EventEmitter } from './EventEmitter';
import { assert } from '@firebase/util';

declare const document: Document;

/**
 * @extends {EventEmitter}
 */
export class VisibilityMonitor extends EventEmitter {
  private visible_: boolean;

  static getInstance() {
    return new VisibilityMonitor();
  }

  constructor() {
    super(['visible']);
    let hidden: string;
    let visibilityChange: string;
    if (
      typeof document !== 'undefined' &&
      typeof document.addEventListener !== 'undefined'
    ) {
      if (typeof document['hidden'] !== 'undefined') {
        // Opera 12.10 and Firefox 18 and later support
        visibilityChange = 'visibilitychange';
        hidden = 'hidden';
      } else if (typeof document['mozHidden'] !== 'undefined') {
        visibilityChange = 'mozvisibilitychange';
        hidden = 'mozHidden';
      } else if (typeof document['msHidden'] !== 'undefined') {
        visibilityChange = 'msvisibilitychange';
        hidden = 'msHidden';
      } else if (typeof document['webkitHidden'] !== 'undefined') {
        visibilityChange = 'webkitvisibilitychange';
        hidden = 'webkitHidden';
      }
    }

    // Initially, we always assume we are visible. This ensures that in browsers
    // without page visibility support or in cases where we are never visible
    // (e.g. chrome extension), we act as if we are visible, i.e. don't delay
    // reconnects
    this.visible_ = true;

    if (visibilityChange) {
      document.addEventListener(
        visibilityChange,
        () => {
          const visible = !document[hidden];
          if (visible !== this.visible_) {
            this.visible_ = visible;
            this.trigger('visible', visible);
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
    assert(eventType === 'visible', 'Unknown event type: ' + eventType);
    return [this.visible_];
  }
}
