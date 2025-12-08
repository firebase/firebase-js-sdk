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
import { LOG_ENTRY_ATTRIBUTE_KEYS, TELEMETRY_TYPE } from './constants';
import { Telemetry, TelemetryOptions } from './public-types';
import { Provider } from '@firebase/component';
import { AnyValueMap, SeverityNumber } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';
import { TelemetryService } from './service';
import { getAppVersion, getSessionId } from './helpers';

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
 * @param options - {@link TelemetryOptions} that configure the Telemetry instance.
 * @returns The default {@link Telemetry} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function getTelemetry(
  app: FirebaseApp = getApp(),
  options?: TelemetryOptions
): Telemetry {
  const telemetryProvider: Provider<'telemetry'> = _getProvider(
    app,
    TELEMETRY_TYPE
  );
  const identifier = options?.endpointUrl || '';
  const telemetry: TelemetryService = telemetryProvider.getImmediate({
    identifier
  });
  if (options) {
    telemetry.options = options;
  }
  return telemetry;
}

/**
 * Enqueues an error to be uploaded to the Firebase Telemetry API.
 *
 * @public
 *
 * @param telemetry - The {@link Telemetry} instance.
 * @param error - The caught exception, typically an {@link Error}
 * @param attributes = Optional, arbitrary attributes to attach to the error log
 */
export function captureError(
  telemetry: Telemetry,
  error: unknown,
  attributes?: AnyValueMap
): void {
  const logger = telemetry.loggerProvider.getLogger('error-logger');
  const customAttributes = attributes || {};

  // Add trace metadata
  const activeSpanContext = trace.getActiveSpan()?.spanContext();
  if (telemetry.app.options.projectId && activeSpanContext?.traceId) {
    customAttributes[
      'logging.googleapis.com/trace'
    ] = `projects/${telemetry.app.options.projectId}/traces/${activeSpanContext.traceId}`;
    if (activeSpanContext?.spanId) {
      customAttributes['logging.googleapis.com/spanId'] =
        activeSpanContext.spanId;
    }
  }

  // Add app version metadata
  customAttributes[LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION] =
    getAppVersion(telemetry);

  // Add session ID metadata
  const sessionId = getSessionId();
  if (sessionId) {
    customAttributes[LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID] = sessionId;
  }

  if (error instanceof Error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: error.message,
      attributes: {
        'error.type': error.name || 'Error',
        'error.stack': error.stack || 'No stack trace available',
        ...customAttributes
      }
    });
  } else if (typeof error === 'string') {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: error,
      attributes: customAttributes
    });
  } else {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      body: `Unknown error type: ${typeof error}`,
      attributes: customAttributes
    });
  }
}

/**
 * Flushes all enqueued telemetry data immediately, instead of waiting for default batching.
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
