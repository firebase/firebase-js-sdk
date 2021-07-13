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

import firebase from '@firebase/app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { StringFormat } from './src/implementation/string';
import { TaskEvent, TaskState } from './src/implementation/taskenums';

import { ConnectionPool } from './src/implementation/connectionPool';
import { ReferenceCompat } from './compat/reference';
import { StorageServiceCompat } from './compat/service';
import { StorageService } from './src/service';
import * as types from '@firebase/storage-types';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactoryOptions
} from '@firebase/component';

import { name, version } from './package.json';

import './register-module';

/**
 * Type constant for Firebase Storage.
 */
const STORAGE_TYPE = 'storage';

function factory(
  container: ComponentContainer,
  { instanceIdentifier: url }: InstanceFactoryOptions
): types.FirebaseStorage {
  // Dependencies
  // TODO: This should eventually be 'app-compat'
  const app = container.getProvider('app').getImmediate();
  const authProvider = container.getProvider('auth-internal');
  const appCheckProvider = container.getProvider('app-check-internal');

  // TODO: get StorageService instance from component framework instead
  // of creating a new one.
  const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
    app,
    new StorageService(
      app,
      authProvider,
      appCheckProvider,
      new ConnectionPool(),
      url,
      firebase.SDK_VERSION
    )
  );
  return storageServiceCompat;
}

export function registerStorage(instance: _FirebaseNamespace): void {
  const namespaceExports = {
    // no-inline
    TaskState,
    TaskEvent,
    StringFormat,
    Storage: StorageService,
    Reference: ReferenceCompat
  };
  instance.INTERNAL.registerComponent(
    new Component(STORAGE_TYPE, factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );

  instance.registerVersion(name, version);
}

registerStorage(firebase as _FirebaseNamespace);
