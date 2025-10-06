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
import { captureError, getTelemetry } from './api';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Instrumentation } from 'next';
import { TelemetryOptions } from './public-types';

export { Instrumentation };

/**
 * Automatically report uncaught errors from server routes to Firebase Telemetry.
 *
 * @example
 * ```javascript
 * // In instrumentation.ts (https://nextjs.org/docs/app/guides/instrumentation):
 * import { nextOnRequestError } from 'firebase/telemetry'
 * export const onRequestError = nextOnRequestError();
 * ```
 *
 * @param telemetryOptions - {@link TelemetryOptions} that configure the Telemetry instance.
 * @returns A request error handler for use in Next.js' instrumentation file
 *
 * @public
 */
export function nextOnRequestError(
  telemetryOptions?: TelemetryOptions
): Instrumentation.onRequestError {
  return async (error, errorRequest, errorContext) => {
    const telemetry = getTelemetry(getApp(), telemetryOptions);

    const attributes = {
      'nextjs_path': errorRequest.path,
      'nextjs_method': errorRequest.method,
      'nextjs_router_kind': errorContext.routerKind,
      'nextjs_route_path': errorContext.routePath,
      'nextjs_route_type': errorContext.routeType
    };

    captureError(telemetry, error, attributes);
  };
}
