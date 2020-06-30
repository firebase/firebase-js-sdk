/**
 * @license
 * Copyright 2019 Google LLC
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
import firebase from '@firebase/app';
import '@firebase/installations';
import { FirebaseAnalytics } from '@firebase/analytics-types';
import { FirebaseAnalyticsInternal } from '@firebase/analytics-interop-types';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import {
  factory,
  settings,
  resetGlobalVars,
  getGlobalVars
} from './src/factory';
import { EventName } from './src/constants';
import {
  Component,
  ComponentType,
  ComponentContainer
} from '@firebase/component';
import { ERROR_FACTORY, AnalyticsError } from './src/errors';

import { name, version } from './package.json';

declare global {
  interface Window {
    [key: string]: unknown;
  }
}

/**
 * Type constant for Firebase Analytics.
 */
const ANALYTICS_TYPE = 'analytics';

export function registerAnalytics(instance: _FirebaseNamespace): void {
  instance.INTERNAL.registerComponent(
    new Component(
      ANALYTICS_TYPE,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const installations = container
          .getProvider('installations')
          .getImmediate();

        validateCookieEnabled();
        validateIndexedDBSupport();

        return factory(app, installations);
      },
      ComponentType.PUBLIC
    ).setServiceProps({
      settings,
      EventName,
      isSupported
    })
  );

  instance.INTERNAL.registerComponent(
    new Component('analytics-internal', internalFactory, ComponentType.PRIVATE)
  );

  instance.registerVersion(name, version);

  function internalFactory(
    container: ComponentContainer
  ): FirebaseAnalyticsInternal {
    try {
      const analytics = container.getProvider(ANALYTICS_TYPE).getImmediate();
      return {
        logEvent: analytics.logEvent
      };
    } catch (e) {
      throw ERROR_FACTORY.create(AnalyticsError.INTEROP_COMPONENT_REG_FAILED, {
        reason: e
      });
    }
  }
}

export { factory, settings, resetGlobalVars, getGlobalVars };

registerAnalytics(firebase as _FirebaseNamespace);

/**
 * Define extension behavior of `registerAnalytics`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    analytics(app?: FirebaseApp): FirebaseAnalytics;
    isSupported(): boolean;
  }
  interface FirebaseApp {
    analytics(): FirebaseAnalytics;
  }
}
/**
 *
 * This method checks whether cookie is enabled within current browser and throw
 * AnalyticsError.COOKIE_NOT_ENABLED if not
 */
function validateCookieEnabled(): void {
  if (!navigator || !navigator.cookieEnabled) {
    throw ERROR_FACTORY.create(AnalyticsError.COOKIE_NOT_ENABLED);
  }
}
/**
 * This method checks if indexedDB is supported by current browser and throws AnalyticsError.INDEXED_DB_UNSUPPORTED error if not.
 *
 * This method also validates browser context for indexedDB by opening a dummy indexedDB database and throws AnalyticsError.INVALID_INDEXED_DB_CONTEXT
 * if errors occur during the database open operation.
 */
function validateIndexedDBSupport(): void {
  if ('indexedDB' in window && indexedDB !== null) {
    try {
      let preExist: boolean = true;
      const DB_CHECK_NAME =
        'validate-browser-context-for-indexeddb-analytics-module';
      const request = window.indexedDB.open(DB_CHECK_NAME);
      request.onsuccess = () => {
        request.result.close();
        // delete database only when it doesn't pre-exist
        if (!preExist) {
          window.indexedDB.deleteDatabase(DB_CHECK_NAME);
        }
      };
      request.onupgradeneeded = () => {
        preExist = false;
      };

      request.onerror = () => {
        throw ERROR_FACTORY.create(AnalyticsError.INVALID_INDEXED_DB_CONTEXT, {
          errorInfo: request.error?.message || ''
        });
      };
    } catch (error) {
      throw ERROR_FACTORY.create(AnalyticsError.INVALID_INDEXED_DB_CONTEXT, {
        errorInfo: error
      });
    }
  } else {
    throw ERROR_FACTORY.create(AnalyticsError.INDEXED_DB_UNSUPPORTED);
  }
}

/**
 * this is a public static method provided to users that wraps two different checks:
 * 1. check if IndexedDB is supported and if the current browser context is valid for using IndexedDB
 * 2. check if cookie is enabled in current browser.
 */
function isSupported(): boolean {
  try {
    validateCookieEnabled();
    validateIndexedDBSupport();
    return true;
  } catch (e) {
    return false;
  }
}
