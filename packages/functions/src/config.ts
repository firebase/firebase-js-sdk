/**
 * @license
 * Copyright 2019 Google LLC
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

import { _registerComponent, registerVersion } from '@firebase/app';
import { FunctionsService } from './service';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactory
} from '@firebase/component';
import { FUNCTIONS_TYPE } from './constants';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { MessagingInternalComponentName } from '@firebase/messaging-interop-types';
import { name, version } from '../package.json';

const AUTH_INTERNAL_NAME: FirebaseAuthInternalName = 'auth-internal';
const APP_CHECK_INTERNAL_NAME: AppCheckInternalComponentName =
  'app-check-internal';
const MESSAGING_INTERNAL_NAME: MessagingInternalComponentName =
  'messaging-internal';

export function registerFunctions(variant?: string): void {
  const factory: InstanceFactory<'functions'> = (
    container: ComponentContainer,
    { instanceIdentifier: regionOrCustomDomain }
  ) => {
    // Dependencies
    const app = container.getProvider('app').getImmediate();
    const authProvider = container.getProvider(AUTH_INTERNAL_NAME);
    const messagingProvider = container.getProvider(MESSAGING_INTERNAL_NAME);
    const appCheckProvider = container.getProvider(APP_CHECK_INTERNAL_NAME);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new FunctionsService(
      app,
      authProvider,
      messagingProvider,
      appCheckProvider,
      regionOrCustomDomain
    );
  };

  _registerComponent(
    new Component(
      FUNCTIONS_TYPE,
      factory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version, variant);
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
