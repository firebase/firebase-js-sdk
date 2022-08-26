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

import { FirebaseError } from '@firebase/util';
import { UserInternal } from '../../model/user';
import { AuthErrorCode } from '../errors';

// Refresh the token five minutes before expiration
export const enum Duration {
  OFFSET = 5 * 1000 * 60,
  RETRY_BACKOFF_MIN = 30 * 1000,
  RETRY_BACKOFF_MAX = 16 * 60 * 1000
}

export class ProactiveRefresh {
  private isRunning = false;

  // Node timers and browser timers return fundamentally different types.
  // We don't actually care what the value is but TS won't accept unknown and
  // we can't cast properly in both environments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private timerId: any | null = null;
  private errorBackoff = Duration.RETRY_BACKOFF_MIN;

  constructor(private readonly user: UserInternal) {}

  _start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.schedule();
  }

  _stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
    }
  }

  private getInterval(wasError: boolean): number {
    if (wasError) {
      const interval = this.errorBackoff;
      this.errorBackoff = Math.min(
        this.errorBackoff * 2,
        Duration.RETRY_BACKOFF_MAX
      );
      return interval;
    } else {
      // Reset the error backoff
      this.errorBackoff = Duration.RETRY_BACKOFF_MIN;
      const expTime = this.user.stsTokenManager.expirationTime ?? 0;
      const interval = expTime - Date.now() - Duration.OFFSET;

      return Math.max(0, interval);
    }
  }

  private schedule(wasError = false): void {
    if (!this.isRunning) {
      // Just in case...
      return;
    }

    const interval = this.getInterval(wasError);
    this.timerId = setTimeout(async () => {
      await this.iteration();
    }, interval);
  }

  private async iteration(): Promise<void> {
    try {
      await this.user.getIdToken(true);
    } catch (e) {
      // Only retry on network errors
      if (
        (e as FirebaseError)?.code ===
        `auth/${AuthErrorCode.NETWORK_REQUEST_FAILED}`
      ) {
        this.schedule(/* wasError */ true);
      }

      return;
    }
    this.schedule();
  }
}
