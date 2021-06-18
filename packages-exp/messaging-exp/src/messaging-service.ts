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

import { FirebaseApp, _FirebaseService } from '@firebase/app-exp';

import { FirebaseAnalyticsInternalName } from '@firebase/analytics-interop-types';
import { FirebaseInternalDependencies } from './interfaces/internal-dependencies';
import { MessagePayload, NextFn, Observer } from './interfaces/public-types';
import { Provider } from '@firebase/component';
import { _FirebaseInstallationsInternal } from '@firebase/installations-exp';
import { extractAppConfig } from './helpers/extract-app-config';

export class MessagingService implements _FirebaseService {
  readonly app!: FirebaseApp;
  readonly firebaseDependencies!: FirebaseInternalDependencies;

  swRegistration?: ServiceWorkerRegistration;
  vapidKey?: string;

  onBackgroundMessageHandler:
    | NextFn<MessagePayload>
    | Observer<MessagePayload>
    | null = null;

  onMessageHandler:
    | NextFn<MessagePayload>
    | Observer<MessagePayload>
    | null = null;

  constructor(
    app: FirebaseApp,
    installations: _FirebaseInstallationsInternal,
    analyticsProvider: Provider<FirebaseAnalyticsInternalName>
  ) {
    const appConfig = extractAppConfig(app);

    this.firebaseDependencies = {
      app,
      appConfig,
      installations,
      analyticsProvider
    };
  }

  _delete(): Promise<void> {
    return Promise.resolve();
  }
}
