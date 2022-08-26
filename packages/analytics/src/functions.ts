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

import {
  AnalyticsCallOptions,
  CustomParams,
  ControlParams,
  EventParams,
  ConsentSettings
} from './public-types';
import { Gtag } from './types';
import { GtagCommand } from './constants';

/**
 * Event parameters to set on 'gtag' during initialization.
 */
export let defaultEventParametersForInit: CustomParams | undefined;

/**
 * Logs an analytics event through the Firebase SDK.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param eventName Google Analytics event name, choose from standard list or use a custom string.
 * @param eventParams Analytics event parameters.
 */
export async function logEvent(
  gtagFunction: Gtag,
  initializationPromise: Promise<string>,
  eventName: string,
  eventParams?: EventParams,
  options?: AnalyticsCallOptions
): Promise<void> {
  if (options && options.global) {
    gtagFunction(GtagCommand.EVENT, eventName, eventParams);
    return;
  } else {
    const measurementId = await initializationPromise;
    const params: EventParams | ControlParams = {
      ...eventParams,
      'send_to': measurementId
    };
    gtagFunction(GtagCommand.EVENT, eventName, params);
  }
}

/**
 * Set screen_name parameter for this Google Analytics ID.
 *
 * @deprecated Use {@link logEvent} with `eventName` as 'screen_view' and add relevant `eventParams`.
 * See {@link https://firebase.google.com/docs/analytics/screenviews | Track Screenviews}.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param screenName Screen name string to set.
 */
export async function setCurrentScreen(
  gtagFunction: Gtag,
  initializationPromise: Promise<string>,
  screenName: string | null,
  options?: AnalyticsCallOptions
): Promise<void> {
  if (options && options.global) {
    gtagFunction(GtagCommand.SET, { 'screen_name': screenName });
    return Promise.resolve();
  } else {
    const measurementId = await initializationPromise;
    gtagFunction(GtagCommand.CONFIG, measurementId, {
      update: true,
      'screen_name': screenName
    });
  }
}

/**
 * Set user_id parameter for this Google Analytics ID.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param id User ID string to set
 */
export async function setUserId(
  gtagFunction: Gtag,
  initializationPromise: Promise<string>,
  id: string | null,
  options?: AnalyticsCallOptions
): Promise<void> {
  if (options && options.global) {
    gtagFunction(GtagCommand.SET, { 'user_id': id });
    return Promise.resolve();
  } else {
    const measurementId = await initializationPromise;
    gtagFunction(GtagCommand.CONFIG, measurementId, {
      update: true,
      'user_id': id
    });
  }
}

/**
 * Set all other user properties other than user_id and screen_name.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param properties Map of user properties to set
 */
export async function setUserProperties(
  gtagFunction: Gtag,
  initializationPromise: Promise<string>,
  properties: CustomParams,
  options?: AnalyticsCallOptions
): Promise<void> {
  if (options && options.global) {
    const flatProperties: { [key: string]: unknown } = {};
    for (const key of Object.keys(properties)) {
      // use dot notation for merge behavior in gtag.js
      flatProperties[`user_properties.${key}`] = properties[key];
    }
    gtagFunction(GtagCommand.SET, flatProperties);
    return Promise.resolve();
  } else {
    const measurementId = await initializationPromise;
    gtagFunction(GtagCommand.CONFIG, measurementId, {
      update: true,
      'user_properties': properties
    });
  }
}

/**
 * Set whether collection is enabled for this ID.
 *
 * @param enabled If true, collection is enabled for this ID.
 */
export async function setAnalyticsCollectionEnabled(
  initializationPromise: Promise<string>,
  enabled: boolean
): Promise<void> {
  const measurementId = await initializationPromise;
  window[`ga-disable-${measurementId}`] = !enabled;
}

/**
 * Consent parameters to default to during 'gtag' initialization.
 */
export let defaultConsentSettingsForInit: ConsentSettings | undefined;

/**
 * Sets the variable {@link defaultConsentSettingsForInit} for use in the initialization of
 * analytics.
 *
 * @param consentSettings Maps the applicable end user consent state for gtag.js.
 */
export function _setConsentDefaultForInit(
  consentSettings?: ConsentSettings
): void {
  defaultConsentSettingsForInit = consentSettings;
}

/**
 * Sets the variable `defaultEventParametersForInit` for use in the initialization of
 * analytics.
 *
 * @param customParams Any custom params the user may pass to gtag.js.
 */
export function _setDefaultEventParametersForInit(
  customParams?: CustomParams
): void {
  defaultEventParametersForInit = customParams;
}
