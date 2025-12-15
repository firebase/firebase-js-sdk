/**
 * @license
 * Copyright 2025 Google LLC
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

import { FirebaseApp } from '@firebase/app';

/**
 * An instance of the Firebase Crashlytics SDK.
 *
 * Do not create this instance directly. Instead, use {@link getCrashlytics | getCrashlytics()}.
 *
 * @public
 */
export interface Crashlytics {
  /**
   * The {@link @firebase/app#FirebaseApp} this {@link Crashlytics} instance is associated with.
   */
  app: FirebaseApp;
}

/**
 * Options for initialized the Telemetry service using {@link getCrashlytics | getCrashlytics()}.
 *
 * @public
 */
export interface CrashlyticsOptions {
  /**
   * The URL for the endpoint to which Crashlytics data should be sent, in the OpenTelemetry format.
   * By default, data will be sent to Firebase.
   */
  endpointUrl?: string;

  /**
   * The version of the application. This should be a unique string that identifies the snapshot of
   * code to be deployed, such as "1.0.2". If not specified, other default locations will be checked
   * for an identifier. Setting a value here takes precedence over any other values.
   */
  appVersion?: string;
}
