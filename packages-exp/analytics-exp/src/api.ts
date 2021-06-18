/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable camelcase */
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

import { _getProvider, FirebaseApp, getApp } from '@firebase/app-exp';
import {
  Analytics,
  AnalyticsCallOptions,
  AnalyticsOptions,
  CustomParams,
  EventNameString,
  EventParams
} from './public-types';
import { Provider } from '@firebase/component';
import {
  isIndexedDBAvailable,
  validateIndexedDBOpenable,
  areCookiesEnabled,
  isBrowserExtension,
  getModularInstance
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
import { ERROR_FACTORY, AnalyticsError } from './errors';

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
export function getAnalytics(app: FirebaseApp = getApp()): Analytics {
  app = getModularInstance(app);
  // Dependencies
  const analyticsProvider: Provider<'analytics-exp'> = _getProvider(
    app,
    ANALYTICS_TYPE
  );

  if (analyticsProvider.isInitialized()) {
    return analyticsProvider.getImmediate();
  }

  return initializeAnalytics(app);
}

/**
 * Returns a Firebase Analytics instance for the given app.
 *
 * @public
 *
 * @param app - The FirebaseApp to use.
 */
export function initializeAnalytics(
  app: FirebaseApp,
  options: AnalyticsOptions = {}
): Analytics {
  // Dependencies
  const analyticsProvider: Provider<'analytics-exp'> = _getProvider(
    app,
    ANALYTICS_TYPE
  );
  if (analyticsProvider.isInitialized()) {
    throw ERROR_FACTORY.create(AnalyticsError.ALREADY_INITIALIZED);
  }
  const analyticsInstance = analyticsProvider.initialize({ options });
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
  analyticsInstance = getModularInstance(analyticsInstance);
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
  analyticsInstance = getModularInstance(analyticsInstance);
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
  analyticsInstance = getModularInstance(analyticsInstance);
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
  analyticsInstance = getModularInstance(analyticsInstance);
  internalSetAnalyticsCollectionEnabled(
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    enabled
  ).catch(e => logger.error(e));
}
/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'add_payment_info',
  eventParams?: {
    coupon?: EventParams['coupon'];
    currency?: EventParams['currency'];
    items?: EventParams['items'];
    payment_type?: EventParams['payment_type'];
    value?: EventParams['value'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'add_shipping_info',
  eventParams?: {
    coupon?: EventParams['coupon'];
    currency?: EventParams['currency'];
    items?: EventParams['items'];
    shipping_tier?: EventParams['shipping_tier'];
    value?: EventParams['value'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'add_to_cart' | 'add_to_wishlist' | 'remove_from_cart',
  eventParams?: {
    currency?: EventParams['currency'];
    value?: EventParams['value'];
    items?: EventParams['items'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'begin_checkout',
  eventParams?: {
    currency?: EventParams['currency'];
    coupon?: EventParams['coupon'];
    value?: EventParams['value'];
    items?: EventParams['items'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'checkout_progress',
  eventParams?: {
    currency?: EventParams['currency'];
    coupon?: EventParams['coupon'];
    value?: EventParams['value'];
    items?: EventParams['items'];
    checkout_step?: EventParams['checkout_step'];
    checkout_option?: EventParams['checkout_option'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'exception',
  eventParams?: {
    description?: EventParams['description'];
    fatal?: EventParams['fatal'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'generate_lead',
  eventParams?: {
    value?: EventParams['value'];
    currency?: EventParams['currency'];
    transaction_id?: EventParams['transaction_id'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'login',
  eventParams?: {
    method?: EventParams['method'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'page_view',
  eventParams?: {
    page_title?: string;
    page_location?: string;
    page_path?: string;
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'purchase' | 'refund',
  eventParams?: {
    value?: EventParams['value'];
    currency?: EventParams['currency'];
    transaction_id: EventParams['transaction_id'];
    tax?: EventParams['tax'];
    shipping?: EventParams['shipping'];
    items?: EventParams['items'];
    coupon?: EventParams['coupon'];
    affiliation?: EventParams['affiliation'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'screen_view',
  eventParams?: {
    app_name: string;
    screen_name: EventParams['screen_name'];
    app_id?: string;
    app_version?: string;
    app_installer_id?: string;
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'search' | 'view_search_results',
  eventParams?: {
    search_term?: EventParams['search_term'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'select_content',
  eventParams?: {
    items?: EventParams['items'];
    promotions?: EventParams['promotions'];
    content_type?: EventParams['content_type'];
    content_id?: EventParams['content_id'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'select_item',
  eventParams?: {
    items?: EventParams['items'];
    item_list_name?: EventParams['item_list_name'];
    item_list_id?: EventParams['item_list_id'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'select_promotion' | 'view_promotion',
  eventParams?: {
    items?: EventParams['items'];
    promotion_id?: EventParams['promotion_id'];
    promotion_name?: EventParams['promotion_name'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'set_checkout_option',
  eventParams?: {
    checkout_step?: EventParams['checkout_step'];
    checkout_option?: EventParams['checkout_option'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'share',
  eventParams?: {
    method?: EventParams['method'];
    content_type?: EventParams['content_type'];
    content_id?: EventParams['content_id'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'sign_up',
  eventParams?: {
    method?: EventParams['method'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'timing_complete',
  eventParams?: {
    name: string;
    value: number;
    event_category?: string;
    event_label?: string;
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'view_cart' | 'view_item',
  eventParams?: {
    currency?: EventParams['currency'];
    items?: EventParams['items'];
    value?: EventParams['value'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: 'view_item_list',
  eventParams?: {
    items?: EventParams['items'];
    item_list_name?: EventParams['item_list_name'];
    item_list_id?: EventParams['item_list_id'];
    [key: string]: any;
  },
  options?: AnalyticsCallOptions
): void;

/**
 * Sends analytics event with given `eventParams`. This method
 * automatically associates this logged event with this Firebase web
 * app instance on this device.
 * @public
 * List of recommended event parameters can be found in
 * {@link https://developers.google.com/gtagjs/reference/event
 * | the gtag.js reference documentation}.
 */
export function logEvent<T extends string>(
  analyticsInstance: Analytics,
  eventName: CustomEventName<T>,
  eventParams?: { [key: string]: any },
  options?: AnalyticsCallOptions
): void;

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
 */
export function logEvent(
  analyticsInstance: Analytics,
  eventName: string,
  eventParams?: EventParams,
  options?: AnalyticsCallOptions
): void {
  analyticsInstance = getModularInstance(analyticsInstance);
  internalLogEvent(
    wrappedGtagFunction,
    initializationPromisesMap[analyticsInstance.app.options.appId!],
    eventName,
    eventParams,
    options
  ).catch(e => logger.error(e));
}

/**
 * Any custom event name string not in the standard list of recommended
 * event names.
 * @public
 */
export type CustomEventName<T> = T extends EventNameString ? never : T;
