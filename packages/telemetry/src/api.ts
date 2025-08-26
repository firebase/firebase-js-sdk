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
import { SeverityNumber } from '@opentelemetry/api-logs';
import { TelemetryService } from './service';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [TELEMETRY_TYPE]: TelemetryService;
  }
}

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

/**
 * Enqueues an error to be uploaded to the Firebase Telemetry API.
 *
 * @public
 *
 * @param telemetry - The {@link Telemetry} instance.
 * @param error - the caught exception, typically an {@link Error}
 */
export function captureError(telemetry: Telemetry, error: unknown): void {
  const logger = telemetry.loggerProvider.getLogger('error-logger');
  if (error instanceof Error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: error.message,
      attributes: {
        'error.type': error.name || 'Error',
        'error.stack': error.stack || 'No stack trace available'
      }
    });
  } else if (typeof error === 'string') {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: error
    });
  } else {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: `Unknown error type: ${typeof error}`
    });
  }
}

/**
 * Flushes all enqueued telemetry data immediately.
 *
 * @public
 *
 * @param telemetry - The {@link Telemetry} instance.
 * @returns a promise which is resolved when all flushes are complete
 */
export function flush(telemetry: Telemetry): Promise<void> {
  return telemetry.loggerProvider.forceFlush().catch(err => {
    console.error('Error flushing logs from Firebase Telemetry:', err);
  });
}
