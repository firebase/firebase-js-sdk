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
import {
  Analytics,
  AnalyticsCallOptions,
  CustomParams,
  EventParams
} from '@firebase/analytics-types-exp';
import { Provider } from '@firebase/component';
import {
  isIndexedDBAvailable,
  validateIndexedDBOpenable,
  areCookiesEnabled,
  isBrowserExtension
} from '@firebase/util';
import { ANALYTICS_TYPE } from './constants';
import {
  AnalyticsService,
  initializationPromisesMap,
  wrappedGtagFunction
} from './factory';
import { logger } from './logger';
import {
  logEvent as internalLogEvent,
  setCurrentScreen as internalSetCurrentScreen,
  setUserId as internalSetUserId,
  setUserProperties as internalSetUserProperties,
  setAnalyticsCollectionEnabled as internalSetAnalyticsCollectionEnabled
} from './functions';

export { settings } from './factory';

declare module '@firebase/component' {
  interface NameServiceMapping {
    [ANALYTICS_TYPE]: AnalyticsService;
  }
}

/**
 * Returns a Firebase Analytics instance for the given app.
 *
 * @public
 *
 * @param app - The FirebaseApp to use.
 */
export function getAnalytics(app: FirebaseApp): Analytics {
  // Dependencies
  const analyticsProvider: Provider<'analytics-exp'> = _getProvider(
    app,
    ANALYTICS_TYPE
  );
  const analyticsInstance = analyticsProvider.getImmediate();
  return analyticsInstance;
}

/**
 * This is a public static method provided to users that wraps four different checks:
 *
 * 1. Check if it's not a browser extension environment.
 * 2. Check if cookies are enabled in current browser.
 * 3. Check if IndexedDB is supported by the browser environment.
 * 4. Check if the current browser context is valid for using IndexedDB.open().
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

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * List of official event parameters can be found in the gtag.js
 * reference documentation:
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 *
 * @public
 *
 * @param analyticsInstance - Firebase Analytics instance.
 * @param eventName - Event name to log. Can be a standard analytics event or any custom string.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: string,
  eventParams?: EventParams,
  options?: AnalyticsCallOptions
): void {
  internalLogEvent(
    wrappedGtagFunction,
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    eventName,
    eventParams,
    options
  ).catch(e => logger.error(e));
}

/**
 * Use gtag 'config' command to set 'screen_name'.
 *
 * @public
 *
 * @param analyticsInstance - Firebase Analytics instance.
 * @param screenName - Screen name to set.
 */
export function setCurrentScreen(
  analyticsInstance: Analytics,
  screenName: string,
  options?: AnalyticsCallOptions
): void {
  internalSetCurrentScreen(
    wrappedGtagFunction,
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    screenName,
    options
  ).catch(e => logger.error(e));
}

/**
 * Use gtag 'config' command to set 'user_id'.
 *
 * @public
 *
 * @param analyticsInstance - Firebase Analytics instance.
 * @param id - User ID to set.
 */
export function setUserId(
  analyticsInstance: Analytics,
  id: string,
  options?: AnalyticsCallOptions
): void {
  internalSetUserId(
    wrappedGtagFunction,
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    id,
    options
  ).catch(e => logger.error(e));
}

/**
 * Use gtag 'config' command to set all params specified.
 *
 * @public
 */
export function setUserProperties(
  analyticsInstance: Analytics,
  properties: CustomParams,
  options?: AnalyticsCallOptions
): void {
  internalSetUserProperties(
    wrappedGtagFunction,
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    properties,
    options
  ).catch(e => logger.error(e));
}

/**
 * Sets whether analytics collection is enabled for this app on this device.
 * window['ga-disable-analyticsId'] = true;
 *
 * @public
 *
 * @param analyticsInstance - Firebase Analytics instance.
 * @param enabled - If true, enables collection, if false, disables it.
 */
export function setAnalyticsCollectionEnabled(
  analyticsInstance: Analytics,
  enabled: boolean
): void {
  internalSetAnalyticsCollectionEnabled(
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    enabled
  ).catch(e => logger.error(e));
}
