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
import { CrashlyticsInternal, ErrorWithSymbol } from './types';
import { ALREADY_LOGGED_FLAG, CRASHLYTICS_TYPE } from './constants';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import { Provider } from '@firebase/component';
import { AnyValueMap, SeverityNumber } from '@opentelemetry/api-logs';
import { CrashlyticsService } from './service';
import {
  flush,
  generateClickSpanName,
  startUserInteractionTrace,
  logVisibilityEvent
} from './helpers';
import { deepEqual } from '@firebase/util';
import { SPAN_ATTR_KEY } from './attributes-store';

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

  // Cast to CrashlyticsInternal to access internal loggerProvider
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  const logger = loggerProvider.getLogger('error-logger');
  const customAttributes: AnyValueMap = attributesStore.getLogAttributes();

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
        'exception.type': error.name || 'Error',
        'exception.stacktrace': error.stack || 'No stack trace available',
        'exception.message': error.message,
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

/**
 * Registers global event listeners for click events.
 *
 * @internal
 */
export function registerUserInteractionTraceListener(
  crashlytics: Crashlytics
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const clickListener = (event: MouseEvent): void => {
    const target = event.target;
    if (!target || !(target instanceof Element)) {
      return;
    }
    const targetElement = target.closest(
      'button, a, [role="button"], input[type="submit"], input[type="button"]'
    );
    if (!targetElement) {
      return;
    }
    const spanName = generateClickSpanName(targetElement);
    startUserInteractionTrace(crashlytics, spanName);
  };

  try {
    window.addEventListener('click', clickListener, { capture: true });
  } catch (error) {
    console.warn(`Firebase Crashlytics was not initialized:\n`, error);
  }
  return () => {
    window.removeEventListener('click', clickListener, { capture: true });
  };
}

/**
 * Creates a log for view boundary on navigation event
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @param urlTemplate - The new URL pattern being navigated to.
 * @param attributes - Optional, arbitrary attributes to attach to the view boundary log
 */
export function logViewBoundary(
  crashlytics: Crashlytics,
  urlTemplate: string,
  attributes?: AnyValueMap
): void {
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  const logger = loggerProvider.getLogger('view-boundary-logger');
  const customAttributes: AnyValueMap = attributesStore.getLogAttributes();

  // Merge in any additional attributes. Explicitly provided attributes take precedence over
  // automatically added attributes.
  if (attributes) {
    Object.assign(customAttributes, attributes);
  }

  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body: 'Navigation event',
    attributes: {
      [SPAN_ATTR_KEY.APP_SCREEN_ID]: urlTemplate,
      ...customAttributes
    }
  });
}

export { flush, startUserInteractionTrace, logVisibilityEvent };
