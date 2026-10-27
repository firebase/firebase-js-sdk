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

import { SeverityNumber, AnyValueMap } from '@opentelemetry/api-logs';
import { Crashlytics, CrashlyticsOptions } from './public-types';
import {
  CrashlyticsFeatureInternal,
  CrashlyticsInternal,
  ErrorWithSymbol
} from './types';
import { type TimeInput } from '@opentelemetry/api';
import { hrTimeToMilliseconds, timeInputToHrTime } from '@opentelemetry/core';
import type { FirebaseOptions } from '@firebase/app-types';
import {
  ALREADY_LOGGED_FLAG,
  CLIENT_CONFIG_API_VERSION,
  DEFAULT_CLIENT_CONFIG_ENDPOINT,
  DEFAULT_TELEMETRY_ENDPOINT,
  DEFAULT_TELEMETRY_REGION
} from './constants';
import { recordError } from './api';

/**
 * Returns the breadcrumbs feature implementation if enabled in options.
 *
 * @internal
 */
export function getBreadcrumbsFeature(
  options?: CrashlyticsOptions
): CrashlyticsFeatureInternal | undefined {
  return options?.features?.find(
    (feature): feature is CrashlyticsFeatureInternal =>
      Boolean(
        feature &&
        (feature as CrashlyticsFeatureInternal).name === 'breadcrumbs'
      )
  );
}

/**
 * Converts OpenTelemetry TimeInput to milliseconds since epoch.
 */
export function timeInputToMilliseconds(time: TimeInput): number {
  return hrTimeToMilliseconds(timeInputToHrTime(time));
}

/**
 * Generates a unique UUID v4 format string.
 * Uses Web Crypto API when available, otherwise falls back to a pseudo-random Math.random-based generator.
 *
 * @internal
 */
export function generateUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a new session UUID. We record it in two places:
 * 1. The client browser's sessionStorage (via attributesStore)
 * 2. In Cloud Logging as its own log entry
 */
export function startNewSession(crashlytics: Crashlytics): void {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  if (typeof sessionStorage !== 'undefined') {
    try {
      const sessionId = generateUuid();
      attributesStore.setSessionId(sessionId);

      const customAttributes = attributesStore.getLogAttributes();

      // Emit session creation log
      const logger = loggerProvider.getLogger('session-logger');
      logger.emit({
        severityNumber: SeverityNumber.DEBUG,
        body: 'Session created',
        attributes: customAttributes
      });
    } catch (e) {
      // Ignore errors accessing sessionStorage (e.g. security restrictions)
    }
  }
}

/**
 * Registers event listeners to flush logs when the page is hidden. In some cases multiple listeners
 * may trigger at the same time, but flushing only occurs once per batch.
 */
export function registerListeners(crashlytics: Crashlytics): () => void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const onVisibilityChange = async (): Promise<void> => {
      if (
        getBreadcrumbsFeature((crashlytics as CrashlyticsInternal).options) &&
        (document.visibilityState === 'visible' ||
          document.visibilityState === 'hidden')
      ) {
        logVisibilityEvent(crashlytics, document.visibilityState);
      }

      if (document.visibilityState === 'hidden') {
        await flush(crashlytics);
      }
    };

    const onPageHide = async (): Promise<void> => {
      await flush(crashlytics);
    };

    window.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }
  return () => {};
}

let activeGlobalErrorListener: {
  crashlytics: Crashlytics;
  unsubscribe: () => void;
} | null = null;

/**
 * Registers global event listeners for uncaught errors and promise rejections.
 * Automatically avoids double logging if the error was already logged.
 *
 * @internal
 */
export function registerGlobalErrorListeners(
  crashlytics: Crashlytics
): () => void {
  if (
    typeof window === 'undefined' ||
    (crashlytics as CrashlyticsInternal).options?.captureUnhandledErrors ===
      false
  ) {
    return () => {};
  }

  if (activeGlobalErrorListener) {
    if (activeGlobalErrorListener.crashlytics === crashlytics) {
      return () => {};
    }
    activeGlobalErrorListener.unsubscribe();
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
    return () => {};
  }

  let isUnsubscribed = false;
  const unsubscribe = (): void => {
    if (isUnsubscribed) {
      return;
    }
    isUnsubscribed = true;
    if (activeGlobalErrorListener?.unsubscribe === unsubscribe) {
      activeGlobalErrorListener = null;
    }
    window.removeEventListener('error', errorListener);
    window.removeEventListener(
      'unhandledrejection',
      unhandledRejectionListener
    );
  };

  activeGlobalErrorListener = {
    crashlytics,
    unsubscribe
  };

  return unsubscribe;
}

/**
 * Flushes all enqueued Crashlytics data immediately, instead of waiting for default batching.
 *
 * @public
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @returns a promise which is resolved when all flushes are complete
 */
export function flush(crashlytics: Crashlytics): Promise<void> {
  // Cast to CrashlyticsInternal to access internal loggerProvider
  return (crashlytics as CrashlyticsInternal).loggerProvider
    .forceFlush()
    .catch(err => {
      console.error('Error flushing logs from Firebase Crashlytics:', err);
    });
}

/**
 * Logs a page visibility transition event (foreground or background).
 *
 * @internal
 *
 * @param crashlytics - The {@link Crashlytics} instance.
 * @param visibilityState - The current page visibility state ('visible' or 'hidden').
 */
export function logVisibilityEvent(
  crashlytics: Crashlytics,
  visibilityState: 'visible' | 'hidden'
): void {
  const { loggerProvider, attributesStore } =
    crashlytics as CrashlyticsInternal;
  const logger = loggerProvider.getLogger('visibility-logger');
  const customAttributes: AnyValueMap = attributesStore.getLogAttributes();

  const body =
    visibilityState === 'hidden'
      ? 'Background lifecycle event'
      : 'Foreground lifecycle event';

  logger.emit({
    severityNumber: SeverityNumber.INFO,
    body,
    attributes: customAttributes
  });
}

/**
 * Resolves the base telemetry endpoint URL based on the provided options.
 * Uses the regional endpoint (REP) format (`https://clienttelemetry.{region}.rep.googleapis.com`)
 * when a non-global region is specified and no custom `endpointUrl` override is provided.
 *
 * @internal
 */
export function getTelemetryEndpointUrl(
  crashlyticsOptions: CrashlyticsOptions = {}
): string {
  const options = crashlyticsOptions || {};
  if (options.endpointUrl) {
    return options.endpointUrl.replace(/\/+$/, '');
  }
  const region = options.region || DEFAULT_TELEMETRY_REGION;
  if (region !== DEFAULT_TELEMETRY_REGION) {
    return `https://clienttelemetry.${region}.rep.googleapis.com`;
  }
  return DEFAULT_TELEMETRY_ENDPOINT;
}

/**
 * Resolves the base Firebase Telemetry API endpoint URL used for `GetClientConfig`, based on the
 * configured region. Uses the regional endpoint (REP) format
 * (`https://firebasetelemetry.{region}.rep.googleapis.com`) when a non-global region is specified,
 * so the configuration is always read from the same location telemetry is exported to.
 *
 * `endpointUrl` is intentionally not honored here: it redirects OTLP export (e.g. to a local
 * collector), while the sampling configuration always lives in Firebase.
 *
 * @internal
 */
export function getClientConfigEndpointUrl(
  crashlyticsOptions: CrashlyticsOptions = {}
): string {
  const region = crashlyticsOptions?.region || DEFAULT_TELEMETRY_REGION;
  if (region !== DEFAULT_TELEMETRY_REGION) {
    return `https://firebasetelemetry.${region}.rep.googleapis.com`;
  }
  return DEFAULT_CLIENT_CONFIG_ENDPOINT;
}

/**
 * Builds the fully-qualified `GetClientConfig` URL for an app, or returns `undefined` when the
 * app options do not identify a project and app.
 *
 * `GetClientConfig` is a public, unauthenticated `GET` (no API key or App Check token): the
 * project in the path is the service consumer, so a single edge-cached response serves every
 * user of the app.
 *
 * @internal
 */
export function getClientConfigUrl(
  firebaseOptions: FirebaseOptions,
  crashlyticsOptions: CrashlyticsOptions = {}
): string | undefined {
  const { projectId, appId } = firebaseOptions;
  if (!projectId || !appId) {
    return undefined;
  }
  const region = crashlyticsOptions?.region || DEFAULT_TELEMETRY_REGION;
  const base = getClientConfigEndpointUrl(crashlyticsOptions);
  return (
    `${base}/${CLIENT_CONFIG_API_VERSION}/projects/${encodeURIComponent(projectId)}` +
    `/locations/${encodeURIComponent(region)}/apps/${encodeURIComponent(appId)}/clientConfig`
  );
}

/**
 * Determines whether a given URL string targets the Firebase Crashlytics telemetry ingestion endpoint
 * or the Firebase Telemetry API client config endpoint.
 * Used to automatically drop self-referential telemetry records (e.g. from ResourceTiming or Fetch instrumentations).
 *
 * @internal
 */
export function isTelemetryUrl(url: unknown, customEndpoint?: string): boolean {
  if (typeof url !== 'string' || !url) {
    return false;
  }
  if (
    /^https?:\/\/(clienttelemetry|firebasetelemetry)\.(googleapis\.com|[a-z0-9-]+\.rep\.googleapis\.com)(\/|$)/.test(
      url
    )
  ) {
    return true;
  }
  if (customEndpoint && url.startsWith(customEndpoint)) {
    return true;
  }
  return false;
}
