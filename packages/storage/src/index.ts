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
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  _registerComponent,
  registerVersion,
  SDK_VERSION
} from '@firebase/app';

import { FirebaseStorageImpl } from '../src/service';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactoryOptions
} from '@firebase/component';

import { name, version } from '../package.json';

import { FirebaseStorage } from './public-types';
import { STORAGE_TYPE } from './constants';

export * from './api';
export * from './api.browser';

function factory(
  container: ComponentContainer,
  { instanceIdentifier: url }: InstanceFactoryOptions
): FirebaseStorage {
  const app = container.getProvider('app').getImmediate();
  const authProvider = container.getProvider('auth-internal');
  const appCheckProvider = container.getProvider('app-check-internal');

  return new FirebaseStorageImpl(
    app,
    authProvider,
    appCheckProvider,
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
  //RUNTIME_ENV will be replaced during the compilation to "node" for nodejs and an empty string for browser
  registerVersion(name, version, '__RUNTIME_ENV__');
  // BUILD_TARGET will be replaced by values like esm2017, cjs2017, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}

registerStorage();
