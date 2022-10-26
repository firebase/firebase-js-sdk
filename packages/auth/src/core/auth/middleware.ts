/**
 * @license
 * Copyright 2022 Google LLC
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

import { AuthInternal } from '../../model/auth';
import { Unsubscribe, User } from '../../model/public_types';
import { AuthErrorCode } from '../errors';

interface MiddlewareEntry {
  (user: User | null): Promise<void>;
  onAbort?: () => void;
}

export class AuthMiddlewareQueue {
  private readonly queue: MiddlewareEntry[] = [];

  constructor(private readonly auth: AuthInternal) {}

  pushCallback(
    callback: (user: User | null) => void | Promise<void>,
    onAbort?: () => void
  ): Unsubscribe {
    // The callback could be sync or async. Wrap it into a
    // function that is always async.
    const wrappedCallback: MiddlewareEntry = (
      user: User | null
    ): Promise<void> =>
      new Promise((resolve, reject) => {
        try {
          const result = callback(user);
          // Either resolve with existing promise or wrap a non-promise
          // return value into a promise.
          resolve(result);
        } catch (e) {
          // Sync callback throws.
          reject(e);
        }
      });
    // Attach the onAbort if present
    wrappedCallback.onAbort = onAbort;
    this.queue.push(wrappedCallback);

    const index = this.queue.length - 1;
    return () => {
      // Unsubscribe. Replace with no-op. Do not remove from array, or it will disturb
      // indexing of other elements.
      this.queue[index] = () => Promise.resolve();
    };
  }

  async runMiddleware(nextUser: User | null): Promise<void> {
    if (this.auth.currentUser === nextUser) {
      return;
    }

    // While running the middleware, build a temporary stack of onAbort
    // callbacks to call if one middleware callback rejects.

    const onAbortStack: Array<() => void> = [];
    try {
      for (const beforeStateCallback of this.queue) {
        await beforeStateCallback(nextUser);

        // Only push the onAbort if the callback succeeds
        if (beforeStateCallback.onAbort) {
          onAbortStack.push(beforeStateCallback.onAbort);
        }
      }
    } catch (e) {
      // Run all onAbort, with separate try/catch to ignore any errors and
      // continue
      onAbortStack.reverse();
      for (const onAbort of onAbortStack) {
        try {
          onAbort();
        } catch (_) {
          /* swallow error */
        }
      }

      throw this.auth._errorFactory.create(AuthErrorCode.LOGIN_BLOCKED, {
        originalMessage: (e as Error)?.message
      });
    }
  }
}
