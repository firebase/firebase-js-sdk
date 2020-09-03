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

import { _FirebaseNamespace } from '@firebase/app-types/private';
import { registerVersion, _registerComponent } from '@firebase/app-exp';
import { name, version } from './package.json';
import { FunctionsService } from './service';
import {
  Component,
  ComponentType,
  InstanceFactory,
  ComponentContainer
} from '@firebase/component';
import { FirebaseApp } from '@firebase/app-types';

registerVersion(name, version);

const factory: InstanceFactory<'functions'> = (
  container: ComponentContainer,
  region?: string
) => {
  // Dependencies
  const app = container.getProvider('app-exp').getImmediate();

  return new FunctionsService(app as FirebaseApp, region);
};

export function registerFunctions(instance: _FirebaseNamespace): void {
  const namespaceExports = {
    // no-inline
    Functions: FunctionsService
  };
  instance.INTERNAL.registerComponent(
    new Component('functions', factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );
}
