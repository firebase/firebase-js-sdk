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
  Gtag,
  CustomParams,
  ControlParams,
  EventParams
} from '@firebase/analytics-types';
import { GtagCommand } from './constants';
/**
 * Logs an analytics event through the Firebase SDK.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param eventName Google Analytics event name, choose from standard list or use a custom string.
 * @param eventParams Analytics event parameters.
 */
export function logEvent(
  gtagFunction: Gtag,
  analyticsId: string,
  eventName: string,
  eventParams?: EventParams,
  options?: AnalyticsCallOptions
): void {
  let params: EventParams | ControlParams = eventParams || {};
  if (!options || !options.global) {
    params = { ...eventParams, 'send_to': analyticsId };
  }
  // Workaround for http://b/141370449 - third argument cannot be undefined.
  gtagFunction(GtagCommand.EVENT, eventName, params || {});
}

// TODO: Brad is going to add `screen_name` to GA Gold config parameter schema

/**
 * Set screen_name parameter for this Google Analytics ID.
 *
 * @param gtagFunction Wrapped gtag function that waits for fid to be set before sending an event
 * @param screenName Screen name string to set.
 */
export function setCurrentScreen(
  gtagFunction: Gtag,
  analyticsId: string,
  screenName: string | null,
  options?: AnalyticsCallOptions
): void {
  if (options && options.global) {
    gtagFunction(GtagCommand.SET, { 'screen_name': screenName });
  } else {
    gtagFunction(GtagCommand.CONFIG, analyticsId, {
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
export function setUserId(
  gtagFunction: Gtag,
  analyticsId: string,
  id: string | null,
  options?: AnalyticsCallOptions
): void {
  if (options && options.global) {
    gtagFunction(GtagCommand.SET, { 'user_id': id });
  } else {
    gtagFunction(GtagCommand.CONFIG, analyticsId, {
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
export function setUserProperties(
  gtagFunction: Gtag,
  analyticsId: string,
  properties: CustomParams,
  options?: AnalyticsCallOptions
): void {
  if (options && options.global) {
    const flatProperties: { [key: string]: unknown } = {};
    for (const key of Object.keys(properties)) {
      // use dot notation for merge behavior in gtag.js
      flatProperties[`user_properties.${key}`] = properties[key];
    }
    gtagFunction(GtagCommand.SET, flatProperties);
  } else {
    gtagFunction(GtagCommand.CONFIG, analyticsId, {
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
export function setAnalyticsCollectionEnabled(
  analyticsId: string,
  enabled: boolean
): void {
  window[`ga-disable-${analyticsId}`] = !enabled;
}
