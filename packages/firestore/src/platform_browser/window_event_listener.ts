/**
 * Copyright 2018 Google Inc.
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

import { VisibilityState } from '../core/types';
import { AsyncQueue } from '../util/async_queue';
import { TabNotificationChannel } from '../local/tab_notification_channel';
import { Code, FirestoreError } from '../util/error';

/** Listener for window events raised by the browser. */
export class WindowEventListener {
  constructor(
    private asyncQueue: AsyncQueue,
    private notificationChannel: TabNotificationChannel
  ) {}

  /** Returns true if 'window' is available in the current environment. */
  static isAvailable(): boolean {
    return typeof window !== 'undefined';
  }

  start(): void {
    if (!WindowEventListener.isAvailable()) {
      throw new FirestoreError(
        Code.UNIMPLEMENTED,
        "'window' is not available on this platform."
      );
    }

    window.addEventListener('visibilityChange', () => {
      let visibility = VisibilityState.Unknown;

      if (window.document.visibilityState === 'visible') {
        visibility = VisibilityState.Foreground;
      } else if (window.document.visibilityState === 'hidden') {
        visibility = VisibilityState.Background;
      }

      this.asyncQueue.schedule(() => {
        this.notificationChannel.setVisibility(visibility);
        return Promise.resolve();
      });
    });
  }
}
