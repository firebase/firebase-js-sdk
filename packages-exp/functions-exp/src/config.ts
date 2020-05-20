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

import { _registerComponent } from '@firebase/app-exp';
import { FunctionsService } from './service';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactory
} from '@firebase/component';

/**
 * Type constant for Firebase Functions.
 */
export const FUNCTIONS_TYPE = 'functions';

export const DEFAULT_REGION = 'us-central1';

const factory: InstanceFactory<'functions'> = (
  container: ComponentContainer,
  region?: string
) => {
  // Dependencies
  const app = container.getProvider('app').getImmediate();
  const authProvider = container.getProvider('auth-internal');
  const messagingProvider = container.getProvider('messaging');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new FunctionsService(app, authProvider, messagingProvider, region);
};

export function registerFunctions(): void {
  const namespaceExports = {
    // no-inline
    Functions: FunctionsService
  };

  _registerComponent(
    new Component(FUNCTIONS_TYPE, factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );
}
