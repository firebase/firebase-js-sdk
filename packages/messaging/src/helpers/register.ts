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
  Component,
  ComponentContainer,
  ComponentType,
  InstanceFactory
} from '@firebase/component';
import {
  onNotificationClick,
  onPush,
  onSubChange
} from '../listeners/sw-listeners';

import { GetTokenOptions } from '../interfaces/public-types';
import { MessagingInternal } from '@firebase/messaging-interop-types';
import { MessagingService } from '../messaging-service';
import { ServiceWorkerGlobalScope } from '../util/sw-types';
import { _registerComponent, registerVersion } from '@firebase/app';
import { getToken } from '../api/getToken';
import { messageEventListener } from '../listeners/window-listener';

import { name, version } from '../../package.json';

const WindowMessagingFactory: InstanceFactory<'messaging'> = (
  container: ComponentContainer
) => {
  const messaging = new MessagingService(
    container.getProvider('app').getImmediate(),
    container.getProvider('installations-internal').getImmediate(),
    container.getProvider('analytics-internal')
  );

  navigator.serviceWorker.addEventListener('message', e =>
    messageEventListener(messaging as MessagingService, e)
  );

  return messaging;
};

const WindowMessagingInternalFactory: InstanceFactory<'messaging-internal'> = (
  container: ComponentContainer
) => {
  const messaging = container
    .getProvider('messaging')
    .getImmediate() as MessagingService;

  const messagingInternal: MessagingInternal = {
    getToken: (options?: GetTokenOptions) => getToken(messaging, options)
  };

  return messagingInternal;
};

declare const self: ServiceWorkerGlobalScope;
const SwMessagingFactory: InstanceFactory<'messaging'> = (
  container: ComponentContainer
) => {
  const messaging = new MessagingService(
    container.getProvider('app').getImmediate(),
    container.getProvider('installations-internal').getImmediate(),
    container.getProvider('analytics-internal')
  );

  self.addEventListener('push', e => {
    e.waitUntil(onPush(e, messaging as MessagingService));
  });
  self.addEventListener('pushsubscriptionchange', e => {
    e.waitUntil(onSubChange(e, messaging as MessagingService));
  });
  self.addEventListener('notificationclick', e => {
    e.waitUntil(onNotificationClick(e));
  });

  return messaging;
};

export function registerMessagingInWindow(): void {
  _registerComponent(
    new Component('messaging', WindowMessagingFactory, ComponentType.PUBLIC)
  );

  _registerComponent(
    new Component(
      'messaging-internal',
      WindowMessagingInternalFactory,
      ComponentType.PRIVATE
    )
  );

  registerVersion(name, version);
  // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

/**
 * The messaging instance registered in sw is named differently than that of in client. This is
 * because both `registerMessagingInWindow` and `registerMessagingInSw` would be called in
 * `messaging-compat` and component with the same name can only be registered once.
 */
export function registerMessagingInSw(): void {
  _registerComponent(
    new Component('messaging-sw', SwMessagingFactory, ComponentType.PUBLIC)
  );
}
