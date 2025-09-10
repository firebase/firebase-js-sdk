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

// The following types mirror those from Next at v15.5
export interface RequestErrorContext {
  routerKind: 'Pages Router' | 'App Router';
  routePath: string;
  routeType: 'render' | 'route' | 'action' | 'middleware';
  renderSource?:
    | 'react-server-components'
    | 'react-server-components-payload'
    | 'server-rendering';
  revalidateReason: 'on-demand' | 'stale' | undefined;
};
export type InstrumentationOnRequestError = (
  error: unknown,
  errorRequest: Readonly<{
    path: string;
    method: string;
    headers: NodeJS.Dict<string | string[]>;
  }>,
  errorContext: Readonly<RequestErrorContext>
) => void | Promise<void>;

/**
 * Automatically report uncaught errors from server routes to Firebase Telemetry.
 *
 * @example
 * ```javascript
 * // In instrumentation.ts (https://nextjs.org/docs/app/guides/instrumentation):
 * export { nextOnRequestError as onRequestError }  from 'firebase/telemetry'
 * ```
 *
 * @public
 */
export const nextOnRequestError: InstrumentationOnRequestError = async (
  error,
  errorRequest,
  errorContext
) => {
  const telemetry = getTelemetry(getApp());

  const attributes = {
    'nextjs_path': errorRequest.path,
    'nextjs_method': errorRequest.method,
    'nextjs_router_kind': errorContext.routerKind,
    'nextjs_route_path': errorContext.routePath,
    'nextjs_route_type': errorContext.routeType
  };

  captureError(telemetry, error, attributes);
};
