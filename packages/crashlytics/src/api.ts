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
import { LOG_ENTRY_ATTRIBUTE_KEYS, CRASHLYTICS_TYPE } from './constants';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { Provider } from '@firebase/component';
import { AnyValueMap, SeverityNumber } from '@opentelemetry/api-logs';
import { trace } from '@opentelemetry/api';
import { CrashlyticsService } from './service';
import { flush, getAppVersion, getSessionId } from './helpers';
import { CrashlyticsInternal } from './types';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [CRASHLYTICS_TYPE]: CrashlyticsService;
  }
}

/**
 * Returns the default {@link Crashlytics} instance that is associated with the provided
 * {@link @firebase/app#FirebaseApp}. If no instance exists, initializes a new instance with the
 * default settings.
 *
 * @example
 * ```javascript
 * const crashlytics = getCrashlytics(app);
 * ```
 *
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param options - {@link CrashlyticsOptions} that configure the Crashlytics instance.
 * @returns The default {@link Crashlytics} instance for the given {@link @firebase/app#FirebaseApp}.
 *
 * @public
 */
export function getCrashlytics(
  app: FirebaseApp = getApp(),
  options?: CrashlyticsOptions
): Crashlytics {
  const crashlyticsProvider: Provider<'crashlytics'> = _getProvider(
    app,
    CRASHLYTICS_TYPE
  );
  const identifier = options?.endpointUrl || '';
  const crashlytics: CrashlyticsService = crashlyticsProvider.getImmediate({
    identifier
  });
  if (options) {
    crashlytics.options = options;
  }
  return crashlytics;
}

/**
 * Enqueues an error to be uploaded to the Firebase Crashlytics API.
 *
 * @public
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @param error - The caught exception, typically an Error object
 * @param attributes - Optional, arbitrary attributes to attach to the error log
 */
export function recordError(
  crashlytics: Crashlytics,
  error: unknown,
  attributes?: AnyValueMap
): void {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  const logger = (crashlytics as CrashlyticsInternal).loggerProvider.getLogger(
    'error-logger'
  );
  const currentSessionSpan = (crashlytics as CrashlyticsInternal).currentSessionSpan;
  const customAttributes: AnyValueMap = {};

  // Add framework-specific metadata
  const frameworkAttributesProvider = (crashlytics as CrashlyticsService)
    .frameworkAttributesProvider;
  if (frameworkAttributesProvider) {
    const frameworkAttributes = frameworkAttributesProvider();
    Object.assign(customAttributes, frameworkAttributes);
  }

  // Add trace metadata
  const activeSpanContext = currentSessionSpan?.spanContext();
  //trace.getActiveSpan()?.spanContext();
  if (crashlytics.app.options.projectId && activeSpanContext?.traceId) {
    customAttributes[
      'logging.googleapis.com/trace'
    ] = `projects/${crashlytics.app.options.projectId}/traces/${activeSpanContext.traceId}`;
    if (activeSpanContext?.spanId) {
      customAttributes['logging.googleapis.com/spanId'] =
        activeSpanContext.spanId;
    }
  }
  console.log('customAttributes', customAttributes);
  console.log('activeSpanContext', activeSpanContext);
  //console.log('trace', trace.getTracer());

  // Add app version metadata
  customAttributes[LOG_ENTRY_ATTRIBUTE_KEYS.APP_VERSION] =
    getAppVersion(crashlytics);

  // Add session ID metadata
  const sessionId = getSessionId();
  if (sessionId) {
    customAttributes[LOG_ENTRY_ATTRIBUTE_KEYS.SESSION_ID] = sessionId;
  }

  // Merge in any additional attributes. Explicitly provided attributes take precedence over
  // automatically added attributes.
  if (attributes) {
    Object.assign(customAttributes, attributes);
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

export { flush };
