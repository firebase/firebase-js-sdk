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

import '@firebase/installations-exp';

import {
  Component,
  ComponentContainer,
  ComponentType,
  InstanceFactory
} from '@firebase/component';
import { ERROR_FACTORY, ErrorCode } from './util/errors';

import { FirebaseMessaging } from '@firebase/messaging-types';
import { MessagingService } from './api';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { _registerComponent } from '@firebase/app-exp';
import { isSupported } from './helpers/isSupported';

const NAMESPACE_EXPORTS = {
  isSupported
};

/**
 * Define extension behavior of `registerMessaging`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    messaging: {
      (app?: FirebaseApp): FirebaseMessaging;
      isSupported(): boolean;
    };
  }
  interface FirebaseApp {
    messaging(): FirebaseMessaging;
  }
}

const messagingFactory: InstanceFactory<'messaging'> = (
  container: ComponentContainer
) => {
  if (!isSupported()) {
    throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
  }

  const messagingService = new MessagingService(container);
  if (!!messagingService.windowController) {
    return messagingService.windowController!;
  } else {
    return messagingService.windowController!;
  }
};

_registerComponent(
  new Component(
    'messaging',
    messagingFactory,
    ComponentType.PUBLIC
  ).setServiceProps(NAMESPACE_EXPORTS)
);
