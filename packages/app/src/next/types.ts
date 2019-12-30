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

import { ComponentContainer } from '@firebase/component';

export interface FirebaseAppNext {
  /**
   * The (read-only) name (identifier) for this App. '[DEFAULT]' is the default
   * App.
   */
  readonly name: string;

  /**
   * The (read-only) configuration options from the app initialization.
   */
  readonly options: FirebaseOptionsNext;

  /**
   * The settable config flag for GDPR opt-in/opt-out
   */
  automaticDataCollectionEnabled: boolean;
}

export interface FirebaseAppInternalNext extends FirebaseAppNext {
  container: ComponentContainer;
  isDeleted: boolean;
  checkDestroyed(): void;
}

export interface FirebaseOptionsNext {
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string;
}

export interface FirebaseAppConfigNext {
  name?: string;
  automaticDataCollectionEnabled?: boolean;
}
