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
import { ERROR_FACTORY, ErrorCode } from '../util/errors';
import { isSwSupported, isWindowSupported } from '../api/isSupported';

import { MessagingService } from '../messaging-service';
import { _registerComponent } from '@firebase/app-exp';

const WindowMessagingFactory: InstanceFactory<'messaging-exp'> = (
  container: ComponentContainer
) => {
  // Top-level 'await' requires 'module' option set to 'esnext' or 'system', and 'target' option
  // set to 'es2017' or higher. For compatibility, use async expression here.
  void (async () => {
    if (!(await isWindowSupported())) {
      throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
    }
  })();

  return new MessagingService(
    container.getProvider('app-exp').getImmediate(),
    container.getProvider('installations-exp-internal').getImmediate(),
    container.getProvider('analytics-internal')
  );
};

const SwMessagingFactory: InstanceFactory<'messaging-exp'> = (
  container: ComponentContainer
) => {
  // Top-level 'await' requires 'module' option set to 'esnext' or 'system', and 'target' option
  // set to 'es2017' or higher. For compatibility, use async expression here.
  void (async () => {
    if (!(await isSwSupported())) {
      throw ERROR_FACTORY.create(ErrorCode.UNSUPPORTED_BROWSER);
    }
  })();

  return new MessagingService(
    container.getProvider('app-exp').getImmediate(),
    container.getProvider('installations-exp-internal').getImmediate(),
    container.getProvider('analytics-internal')
  );
};

export function registerWindowMessaging(): void {
  _registerComponent(
    new Component('messaging-exp', WindowMessagingFactory, ComponentType.PUBLIC)
  );
}

export function registerSwMessaging(): void {
  _registerComponent(
    new Component('messaging-exp', SwMessagingFactory, ComponentType.PUBLIC)
  );
}
