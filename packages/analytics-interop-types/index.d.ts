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

export interface FirebaseAnalyticsInternal {
  /**
   * Sends analytics event with given `eventParams`. This method
   * automatically associates this logged event with this Firebase web
   * app instance on this device.
   * List of official event parameters can be found in
   * {@link https://developers.google.com/gtagjs/reference/event
   * the gtag.js reference documentation}.
   */
  logEvent(
    eventName: string,
    eventParams?: { [key: string]: unknown },
    options?: AnalyticsCallOptions
  ): void;
}

export interface AnalyticsCallOptions {
  /**
   * If true, this config or event call applies globally to all
   * analytics properties on the page.
   */
  global: boolean;
}

export type FirebaseAnalyticsInternalName = 'analytics-internal';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'analytics-internal': FirebaseAnalyticsInternal;
  }
}
