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

import { TelemetryOptions } from './public-types';

/**
 * Encodes {@link TelemetryOptions} into a string that will be used to uniquely identify
 * {@link Telemetry} instances by endpoint URL.
 *
 * @internal
 */
export function encodeInstanceIdentifier(options: TelemetryOptions): string {
  return options.endpointUrl || '';
}

/**
 * Decodes an instance identifier string into {@link TelemetryOptions}.
 *
 * @internal
 */
export function decodeInstanceIdentifier(identifier: string): TelemetryOptions {
  if (identifier) {
    return {
      endpointUrl: identifier
    };
  }
  return {};
}
