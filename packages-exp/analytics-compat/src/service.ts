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

import {
  AnalyticsCallOptions,
  CustomParams,
  EventParams,
  FirebaseAnalytics
} from '@firebase/analytics-types';
import { FirebaseApp } from '@firebase/app-types';
import {
  Analytics as AnalyticsServiceExp,
  logEvent as logEventExp,
  setAnalyticsCollectionEnabled as setAnalyticsCollectionEnabledExp,
  setCurrentScreen as setCurrentScreenExp,
  setUserId as setUserIdExp,
  setUserProperties as setUserPropertiesExp
} from '@firebase/analytics-exp';

export class AnalyticsService implements FirebaseAnalytics {
  constructor(
    public app: FirebaseApp,
    private _analyticsServiceExp: AnalyticsServiceExp
  ) {}

  logEvent(
    eventName: string,
    eventParams?: EventParams | CustomParams,
    options?: AnalyticsCallOptions
  ): void {
    logEventExp(
      this._analyticsServiceExp,
      eventName as '',
      eventParams,
      options
    );
  }

  setCurrentScreen(screenName: string, options?: AnalyticsCallOptions): void {
    setCurrentScreenExp(this._analyticsServiceExp, screenName, options);
  }

  setUserId(id: string, options?: AnalyticsCallOptions): void {
    setUserIdExp(this._analyticsServiceExp, id, options);
  }

  setUserProperties(
    properties: CustomParams,
    options?: AnalyticsCallOptions
  ): void {
    setUserPropertiesExp(this._analyticsServiceExp, properties, options);
  }

  setAnalyticsCollectionEnabled(enabled: boolean): void {
    setAnalyticsCollectionEnabledExp(this._analyticsServiceExp, enabled);
  }
}
