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

import { _registerComponent, registerVersion } from '@firebase/app';
import {
  Component,
  ComponentType,
  InstanceFactoryOptions
} from '@firebase/component';
import { name, version } from '../package.json';
import { CrashlyticsService } from './service';
import { createLoggerProvider } from './logging/logger-provider';
import { AppCheckProvider } from './logging/appcheck-provider';
import {
  CRASHLYTICS_TYPE,
  DEFAULT_TELEMETRY_REGION,
  LOCAL_STORAGE_CLIENT_CONFIG_KEY_PREFIX
} from './constants';
import {
  getBreadcrumbsFeature,
  getClientConfigUrl,
  registerGlobalErrorListeners,
  registerListeners,
  startNewSession
} from './helpers';
import { CrashlyticsOptions } from './public-types';
import { ClientConfigStore } from './sampling/client-config';
import { SessionSampler } from './sampling/session-sampler';
import { isTelemetryDebugEnabled } from './sampling/debug-override';

// We only import types from this package elsewhere in the `telemetry` package, so this
// explicit import is needed here to prevent this module from being tree-shaken out.
import '@firebase/installations';
import { AttributesStore } from './attributes-store';

export function registerCrashlytics(): void {
  _registerComponent(
    new Component(
      CRASHLYTICS_TYPE,
      (container, { options }: InstanceFactoryOptions) => {
        const crashlyticsOptions = (options as CrashlyticsOptions) || {};

        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const appCheckProvider = container.getProvider('app-check-internal');
        const installationsProvider = container.getProvider(
          'installations-internal'
        );
        const attributesStore = new AttributesStore(
          app.options,
          crashlyticsOptions,
          installationsProvider
        );
        const breadcrumbsFeature = getBreadcrumbsFeature(crashlyticsOptions);
        const telemetryStore = breadcrumbsFeature?.createTelemetryStore();
        const dynamicHeaderProviders = [new AppCheckProvider(appCheckProvider)];

        // Client-side session sampling: the configuration (enablement + sampling rate) is loaded
        // from the local cache now and refreshed in the background; the per-session decision is
        // made lazily at the first export attempt.
        const region = crashlyticsOptions.region || DEFAULT_TELEMETRY_REGION;
        const clientConfigStore = new ClientConfigStore(
          getClientConfigUrl(app.options, crashlyticsOptions),
          `${LOCAL_STORAGE_CLIENT_CONFIG_KEY_PREFIX}:${app.options.appId ?? ''}:${region}`
        );
        const sessionSampler = new SessionSampler(
          clientConfigStore,
          attributesStore
        );
        // Evaluate the debug override early so a `?firebase_telemetry_debug=true` query parameter
        // is persisted for the rest of the browser session.
        isTelemetryDebugEnabled();

        const { loggerProvider, onErrorLogRecordProcessor } =
          createLoggerProvider(
            app,
            crashlyticsOptions,
            attributesStore,
            telemetryStore,
            dynamicHeaderProviders,
            sessionSampler
          );

        const { tracingProvider, onErrorSpanProcessor } =
          breadcrumbsFeature && telemetryStore
            ? breadcrumbsFeature.createTracingProvider(
                app,
                crashlyticsOptions,
                attributesStore,
                telemetryStore,
                dynamicHeaderProviders,
                sessionSampler
              )
            : { tracingProvider: null, onErrorSpanProcessor: undefined };

        const crashlyticsService = new CrashlyticsService(
          app,
          loggerProvider,
          tracingProvider,
          attributesStore,
          telemetryStore,
          onErrorLogRecordProcessor,
          onErrorSpanProcessor,
          clientConfigStore,
          sessionSampler
        );

        if (options) {
          crashlyticsService.options = crashlyticsOptions;
        }

        // Start the non-blocking config fetch and periodic refresh.
        clientConfigStore.start();

        // Immediately track this as a new client session (if one doesn't exist yet)
        if (!attributesStore.sessionId) {
          startNewSession(crashlyticsService);
        }

        // Register relevant event listeners
        const unsubscribeListeners = registerListeners(crashlyticsService);
        const unsubscribeGlobalErrorListeners =
          crashlyticsOptions.captureUnhandledErrors !== false
            ? registerGlobalErrorListeners(crashlyticsService)
            : () => {};
        crashlyticsService.unsubscribeListeners(() => {
          unsubscribeListeners();
          unsubscribeGlobalErrorListeners();
        });

        return crashlyticsService;
      },
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
