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
import { ALREADY_LOGGED_FLAG, CRASHLYTICS_TYPE } from './constants';
import { CrashlyticsInternal, ErrorWithSymbol } from './types';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { Provider } from '@firebase/component';
import { AnyValueMap, SeverityNumber, Logger } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { CrashlyticsService } from './service';
import { flush } from './helpers';
import { deepEqual } from '@firebase/util';

import { registerCrashlytics } from './register';

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
  registerCrashlytics();
  const crashlyticsProvider: Provider<'crashlytics'> = _getProvider(
    app,
    CRASHLYTICS_TYPE
  );

  if (crashlyticsProvider.isInitialized()) {
    const existingInstance = crashlyticsProvider.getImmediate();
    if (deepEqual(options || {}, crashlyticsProvider.getOptions())) {
      return existingInstance;
    } else {
      throw new Error(
        'getCrashlytics() cannot be called with different options'
      );
    }
  }

  const crashlytics: CrashlyticsService = crashlyticsProvider.initialize({
    options
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
  if (error && typeof error === 'object') {
    try {
      (error as ErrorWithSymbol)[ALREADY_LOGGED_FLAG] = true;
    } catch (e) {
      // Ignore if frozen
    }
  }

  const internal = crashlytics as CrashlyticsInternal;
  const logger =
    internal.logger || internal.loggerProvider.getLogger('error-logger');
  const customAttributes: AnyValueMap =
    internal.attributesStore.getLogAttributes();

  if (attributes) {
    Object.assign(customAttributes, attributes);
  }

  if (error instanceof Error) {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: error.message || error.name || 'Error',
      attributes: {
        'exception.type': error.name || 'Error',
        'exception.message': error.message,
        'exception.stacktrace': error.stack || 'No stack trace available',
        ...customAttributes
      }
    });
  } else if (typeof error === 'string') {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: error,
      attributes: customAttributes
    });
  } else {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: `Unknown error type: ${typeof error}`,
      attributes: customAttributes
    });
  }
}

/**
 * Retrieves the OpenTelemetry LoggerProvider instance used by Crashlytics.
 *
 * @public
 * @param crashlytics - The {@link Crashlytics} instance.
 * @returns The underlying OpenTelemetry LoggerProvider.
 */
export function getOtelLoggerProvider(
  crashlytics: Crashlytics
): LoggerProvider {
  return (crashlytics as CrashlyticsInternal).loggerProvider;
}

/**
 * Retrieves the OpenTelemetry Logger instance used by Crashlytics.
 *
 * @public
 * @param crashlytics - The {@link Crashlytics} instance.
 * @returns The underlying OpenTelemetry Logger.
 */
export function getOtelLogger(crashlytics: Crashlytics): Logger {
  return (crashlytics as CrashlyticsInternal).logger;
}

export { flush };

/**
 * Registers global event listeners for uncaught errors and promise rejections.
 * Automatically avoids double logging if the error was already logged.
 *
 * @internal
 */
export function registerGlobalErrorListeners(
  crashlytics: Crashlytics
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const errorListener = (event: ErrorEvent): void => {
    if (event.error && (event.error as ErrorWithSymbol)[ALREADY_LOGGED_FLAG]) {
      return;
    }
    recordError(crashlytics, event.error);
  };

  const unhandledRejectionListener = (event: PromiseRejectionEvent): void => {
    if (
      event.reason &&
      (event.reason as ErrorWithSymbol)[ALREADY_LOGGED_FLAG]
    ) {
      return;
    }
    recordError(crashlytics, event.reason);
  };

  try {
    window.addEventListener('error', errorListener);
    window.addEventListener('unhandledrejection', unhandledRejectionListener);
  } catch (error) {
    console.warn(`Firebase Crashlytics was not initialized:\n`, error);
  }

  return () => {
    window.removeEventListener('error', errorListener);
    window.removeEventListener(
      'unhandledrejection',
      unhandledRejectionListener
    );
  };
}
