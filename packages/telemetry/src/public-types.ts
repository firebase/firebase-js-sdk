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
import { LoggerProvider } from '@opentelemetry/sdk-logs';

/**
 * An instance of the Firebase Telemetry SDK.
 *
 * Do not create this instance directly. Instead, use {@link getTelemetry | getTelemetry()}.
 *
 * @public
 */
export interface Telemetry {
  /**
   * The {@link @firebase/app#FirebaseApp} this {@link Telemetry} instance is associated with.
   */
  app: FirebaseApp;

  /** The {@link LoggerProvider} this {@link Telemetry} instance uses. */
  loggerProvider: LoggerProvider;
}
