/**
 * @license
 * Copyright 2019 Google Inc.
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
import { FirebaseAnalytics } from '@firebase/analytics-types';
import {
  FirebaseServiceFactory,
  _FirebaseNamespace
} from '@firebase/app-types/private';
import { factory, settings, resetGlobalVars } from './src/factory';
import { EventName } from './src/constants';

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
  instance.INTERNAL.registerService(
    ANALYTICS_TYPE,
    factory as FirebaseServiceFactory,
    {
      settings,
      EventName
    },
    // We don't need to wait on any AppHooks.
    undefined,
    // Allow multiple analytics instances per app.
    false
  );
}

export { factory, settings, resetGlobalVars };

registerAnalytics(firebase as _FirebaseNamespace);

/**
 * Define extension behavior of `registerAnalytics`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    analytics(app?: FirebaseApp): FirebaseAnalytics;
  }
  interface FirebaseApp {
    analytics(): FirebaseAnalytics;
  }
}
