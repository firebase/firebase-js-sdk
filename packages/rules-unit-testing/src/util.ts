/**
 * @license
 * Copyright 2021 Google LLC
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

/**
 * Run a setup function with background Cloud Functions triggers disabled. This can be used to
 * import data into the Realtime Database or Cloud Firestore emulator without triggering locally
 * emulated Cloud Functions.
 *
 * This method only works with Firebase CLI version 8.13.0 or higher. This overload works only if
 * the Emulator hub host:port is specified by the environment variable FIREBASE_EMULATOR_HUB.
 *
 * @param fn an function which may be sync or async (returns a promise)
 * @public
 */
export async function withFunctionTriggersDisabled<TResult>(
  fn: () => TResult | Promise<TResult>
): Promise<TResult>;

/**
 * Run a setup function with background Cloud Functions triggers disabled. This can be used to
 * import data into the Realtime Database or Cloud Firestore emulator without triggering locally
 * emulated Cloud Functions.
 *
 * This method only works with Firebase CLI version 8.13.0 or higher. The Emulator hub must be
 * running, which host and port are specified in this overload.
 *
 * @param fn an function which may be sync or async (returns a promise)
 * @param hub the host and port of the Emulator Hub (ex: `{host: 'localhost', port: 4400}`)
 * @public
 */ export async function withFunctionTriggersDisabled<TResult>(
  hub: { host: string; port: number },
  fn: () => TResult | Promise<TResult>
): Promise<TResult>;

export async function withFunctionTriggersDisabled<TResult>(
  fnOrHub: { host: string; port: number } | (() => TResult | Promise<TResult>),
  maybeFn?: () => TResult | Promise<TResult>
): Promise<TResult> {
  throw new Error('unimplemented');
}

/**
 * Assert the promise to be rejected with a "permission denied" error.
 *
 * Useful to assert a certain request to be denied by Security Rules. See example below.
 * This function recognizes permission-denied errors from Database, Firestore, and Storage JS SDKs.
 *
 * @param pr the promise to be asserted
 * @returns a Promise that is fulfilled if pr is rejected with "permission denied". If pr is
 *          rejected with any other error or resolved, the returned promise rejects.
 * @public
 * @example
 * ```javascript
 * const unauthed = testEnv.unauthenticatedContext();
 * await assertFails(get(doc(unauthed.firestore(), '/private/doc'), { ... });
 * ```
 */
export function assertFails(pr: Promise<any>): Promise<any> {
  return pr.then(
    () => {
      return Promise.reject(
        new Error('Expected request to fail, but it succeeded.')
      );
    },
    (err: any) => {
      const errCode = (err && err.code && err.code.toLowerCase()) || '';
      const errMessage =
        (err && err.message && err.message.toLowerCase()) || '';
      const isPermissionDenied =
        errCode === 'permission-denied' ||
        errCode === 'permission_denied' ||
        errMessage.indexOf('permission_denied') >= 0 ||
        errMessage.indexOf('permission denied') >= 0 ||
        // Storage permission errors contain message: (storage/unauthorized)
        errMessage.indexOf('unauthorized') >= 0;

      if (!isPermissionDenied) {
        return Promise.reject(
          new Error(
            `Expected PERMISSION_DENIED but got unexpected error: ${err}`
          )
        );
      }
      return err;
    }
  );
}

/**
 * Assert the promise to be rejected with a "permission denied" error.
 *
 * This is a no-op function returning the passed promise as-is, but can be used for documentational
 * purposes in test code to emphasize that a certain request should succeed (e.g. allowed by rules).
 *
 * @public
 * @example
 * ```javascript
 * const alice = testEnv.authenticatedContext('alice');
 * await assertSucceeds(get(doc(alice.firestore(), '/doc/readable/by/alice'), { ... });
 * ```
 */
export function assertSucceeds<T>(pr: Promise<T>): Promise<T> {
  return pr;
}
