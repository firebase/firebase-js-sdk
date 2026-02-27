/**
 * @license
 * Copyright 2025 Google LLC
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

import { getApp } from '@firebase/app';
import { recordError, getCrashlytics } from './api';
import { Instrumentation } from 'next';
import { CrashlyticsOptions } from './public-types';
import {
  FRAMEWORK_ATTRIBUTE_KEYS,
  NEXTJS_REQUEST_ATTRIBUTE_KEYS
} from './constants';

export { Instrumentation };

/**
 * Automatically report uncaught errors from server routes to Firebase Crashlytics.
 *
 * @example
 * ```javascript
 * // In instrumentation.ts (https://nextjs.org/docs/app/guides/instrumentation):
 * import { nextOnRequestError } from 'firebase/crashlytics'
 * export const onRequestError = nextOnRequestError();
 * ```
 *
 * @param crashlyticsOptions - {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * @returns A request error handler for use in Next.js' instrumentation file
 *
 * @public
 */
export function nextOnRequestError(
  crashlyticsOptions?: CrashlyticsOptions
): Instrumentation.onRequestError {
  return async (error, errorRequest, errorContext) => {
    const crashlytics = getCrashlytics(getApp(), crashlyticsOptions);

    const attributes = {
      [FRAMEWORK_ATTRIBUTE_KEYS.ROUTE_PATH]: errorContext.routePath,
      [NEXTJS_REQUEST_ATTRIBUTE_KEYS.PATH]: errorRequest.path,
      [NEXTJS_REQUEST_ATTRIBUTE_KEYS.METHOD]: errorRequest.method,
      [NEXTJS_REQUEST_ATTRIBUTE_KEYS.ROUTER_KIND]: errorContext.routerKind,
      [NEXTJS_REQUEST_ATTRIBUTE_KEYS.ROUTE_TYPE]: errorContext.routeType
    };

    recordError(crashlytics, error, attributes);
  };
}
