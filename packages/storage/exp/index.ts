/**
 * Cloud Storage for Firebase
 *
 * @packageDocumentation
 */

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
  _registerComponent,
  registerVersion,
  SDK_VERSION
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/app-exp';

import { ConnectionPool } from '../src/implementation/connectionPool';
import { StorageService as StorageServiceInternal } from '../src/service';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactoryOptions
} from '@firebase/component';

import { name, version } from '../package.json';

import { StorageService } from './public-types';
import { STORAGE_TYPE } from './constants';

export { StringFormat } from '../src/implementation/string';
export * from './api';

function factory(
  container: ComponentContainer,
  { instanceIdentifier: url }: InstanceFactoryOptions
): StorageService {
  const app = container.getProvider('app-exp').getImmediate();
  const authProvider = container.getProvider('auth-internal');
  const appCheckProvider = container.getProvider('app-check-internal');

  return new StorageServiceInternal(
    app,
    authProvider,
    appCheckProvider,
    new ConnectionPool(),
    url,
    SDK_VERSION
  );
}

function registerStorage(): void {
  _registerComponent(
    new Component(
      STORAGE_TYPE,
      factory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  registerVersion(name, version);
}

registerStorage();
