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

import { _getProvider, FirebaseApp, getApp } from '@firebase/app';
import { TELEMETRY_TYPE } from './constants';
import { Telemetry } from './public-types';
import { Provider } from '@firebase/component';

/**
 * Returns the default {@link Telemetry} instance that is associated with the provided
 * {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new instance with the
 * default settings.
 *
 * @example
 * ```javascript
 * const telemetry = getTelemetry(app);
 * ```
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @returns The default {@link Telemetry} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function getTelemetry(app: FirebaseApp = getApp()): Telemetry {
  // Dependencies
  const telemetryProvider: Provider<'telemetry'> = _getProvider(
    app,
    TELEMETRY_TYPE
  );

  return telemetryProvider.getImmediate();
}
