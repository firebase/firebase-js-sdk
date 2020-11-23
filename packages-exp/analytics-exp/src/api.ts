/**
 * @license
 * Copyright 2020 Google LLC
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

import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import { Provider } from '@firebase/component';
import {
  isIndexedDBAvailable,
  validateIndexedDBOpenable,
  areCookiesEnabled,
  isBrowserExtension
} from '@firebase/util';
import { ANALYTICS_TYPE } from './constants';
import { AnalyticsService } from './factory';

export {
  logEvent,
  setCurrentScreen,
  setUserId,
  setUserProperties,
  setAnalyticsCollectionEnabled,
  settings
} from './factory';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [ANALYTICS_TYPE]: AnalyticsService;
  }
}

/**
 * Returns an Analytics instance for the given app.
 *
 * @public
 *
 * @param app - The FirebaseApp to use.
 */
export function getAnalytics(app: FirebaseApp): AnalyticsService {
  // Dependencies
  const analyticsProvider: Provider<'analytics-exp'> = _getProvider(
    app,
    ANALYTICS_TYPE
  );
  const analyticsInstance = analyticsProvider.getImmediate();
  return analyticsInstance;
}

/**
 * this is a public static method provided to users that wraps four different checks:
 *
 * 1. check if it's not a browser extension environment.
 * 1. check if cookie is enabled in current browser.
 * 3. check if IndexedDB is supported by the browser environment.
 * 4. check if the current browser context is valid for using IndexedDB.
 *
 * @public
 *
 */
export async function isSupported(): Promise<boolean> {
  if (isBrowserExtension()) {
    return false;
  }
  if (!areCookiesEnabled()) {
    return false;
  }
  if (!isIndexedDBAvailable()) {
    return false;
  }

  try {
    const isDBOpenable: boolean = await validateIndexedDBOpenable();
    return isDBOpenable;
  } catch (error) {
    return false;
  }
}
