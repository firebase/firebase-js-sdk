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

import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import { NextFn, Observer } from '@firebase/util';

import { FirebaseAnalyticsInternalName } from '@firebase/analytics-interop-types';
import { FirebaseInstallations } from '@firebase/installations-types-exp';
import { FirebaseInternalDependencies } from './interfaces/internal-dependencies';
import { MessagePayload } from '@firebase/messaging-types-exp';
import { Provider } from '@firebase/component';
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
    installations: FirebaseInstallations,
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
    throw new Error('Method not implemented.');
  }
}
