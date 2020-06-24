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
const NAMESPACE_EXPORTS = {
  isSupported
};
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

        validateBrowserContext();

        return factory(app, installations);
      },
      ComponentType.PUBLIC
    )
      .setServiceProps({
        settings,
        EventName
      })
      .setServiceProps(NAMESPACE_EXPORTS)
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
function validateBrowserContext(): void {
  if ('indexedDB' in window && indexedDB !== null && navigator.cookieEnabled) {
    try {
      let preExist: boolean = true;
      const DUMMYDBNAME =
        'a-dummy-database-for-testing-browser-context-firebase';
      const request = window.indexedDB.open(DUMMYDBNAME);
      request.onsuccess = () => {
        //console.log('successfully opend dummy indexedDB');
        request.result.close();
        // delete database only when it doesn't pre-exist
        if (!preExist) {
          //console.log("deleting database");
          window.indexedDB.deleteDatabase(DUMMYDBNAME);
        }
      };
      request.onupgradeneeded = () => {
        preExist = false;
        //console.log('database needs to be upgraded');
      };

      request.onerror = () => {
        throw ERROR_FACTORY.create(AnalyticsError.INVALID_INDEXED_DB_CONTEXT, {
          errorInfo: request.error!.message
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
function isSupported(): boolean {
  try {
    validateBrowserContext();
    return true;
  } catch (e) {
    return false;
  }
}
