/**
 * @license
 * Copyright 2017 Google LLC
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

import { ComponentContainer, Provider } from '@firebase/component';
import { FirebaseApp, _FirebaseService } from '@firebase/app-types-exp';
import {
  FirebaseMessaging,
  MessagePayload
} from '@firebase/messaging-types-exp';
import { NextFn, Observer, Unsubscribe } from '@firebase/util';

import { FirebaseInternalDependencies } from './interfaces/internal-dependencies';
import { SwController } from './controllers/sw-controller';
import { WindowController } from './controllers/window-controller';
import { _getProvider } from '@firebase/app-exp';
import { extractAppConfig } from './helpers/extract-app-config';

export function getMessaging(app: FirebaseApp): FirebaseMessaging {
  const messagingProvider: Provider<'messaging'> = _getProvider(
    app,
    'messaging'
  );

  return messagingProvider.getImmediate();
}

export function getToken(
  messaging: FirebaseMessaging,
  options?: { vapidKey?: string; swReg?: ServiceWorkerRegistration }
): Promise<string> {
  return messaging.getToken(options);
}

export function deleteToken(messaging: FirebaseMessaging): Promise<boolean> {
  return messaging.deleteToken();
}

export function onMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return messaging.onMessage(nextOrObserver);
}

export function onBackgroundMessage(
  messaging: FirebaseMessaging,
  nextOrObserver: NextFn<MessagePayload> | Observer<MessagePayload>
): Unsubscribe {
  return messaging.onBackgroundMessage(nextOrObserver);
}

export class MessagingService implements _FirebaseService {
  app!: FirebaseApp;
  readonly windowController: WindowController | null = null;
  readonly swController: SwController | null = null;

  constructor(container: ComponentContainer) {
    const app = container.getProvider('app-exp').getImmediate();
    const appConfig = extractAppConfig(app);
    const installations = container.getProvider('installations').getImmediate();
    const analyticsProvider = container.getProvider('analytics-internal');

    const firebaseDependencies: FirebaseInternalDependencies = {
      app,
      appConfig,
      installations,
      analyticsProvider
    };

    if (self && 'ServiceWorkerGlobalScope' in self) {
      this.swController = new SwController(firebaseDependencies);
    } else {
      this.windowController = new WindowController(firebaseDependencies);
    }
  }

  _delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
