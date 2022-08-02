/**
 * @license
 * Copyright 2021 Google LLC
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

import firebase, {
  _FirebaseNamespace,
  FirebaseApp
} from '@firebase/app-compat';
import { FirebaseAnalytics } from '@firebase/analytics-types';
import { name, version } from '../package.json';
import { AnalyticsService } from './service';
import {
  Component,
  ComponentContainer,
  ComponentType,
  InstanceFactory
} from '@firebase/component';
import {
  settings as settingsExp,
  isSupported as isSupportedExp
} from '@firebase/analytics';
import { EventName } from './constants';

const factory: InstanceFactory<'analytics-compat'> = (
  container: ComponentContainer
) => {
  // Dependencies
  const app = container.getProvider('app-compat').getImmediate();
  const analyticsServiceExp = container.getProvider('analytics').getImmediate();

  return new AnalyticsService(app as FirebaseApp, analyticsServiceExp);
};

export function registerAnalytics(): void {
  const namespaceExports = {
    Analytics: AnalyticsService,
    settings: settingsExp,
    isSupported: isSupportedExp,
    // We removed this enum in exp so need to re-create it here for compat.
    EventName
  };
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component('analytics-compat', factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );
}

registerAnalytics();
firebase.registerVersion(name, version);

/**
 * Define extension behavior of `registerAnalytics`
 */
declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    analytics(app?: FirebaseApp): FirebaseAnalytics;
  }
  interface FirebaseApp {
    analytics(): FirebaseAnalytics;
  }
}
