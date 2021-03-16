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

import { MessagingCompat } from './messaging-compat';
import { _registerComponent } from '@firebase/app-exp';

const messagingCompatFactory: InstanceFactory<'messaging-compat'> = (
  container: ComponentContainer
) => {
  return new MessagingCompat(
    container.getProvider('app-compat').getImmediate(),
    container.getProvider('messaging-exp').getImmediate()
  );
};

export function registerMessagingCompat(): void {
  _registerComponent(
    new Component('messaging-exp', messagingCompatFactory, ComponentType.PUBLIC)
  );
}
