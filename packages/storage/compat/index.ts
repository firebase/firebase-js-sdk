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
import firebase from '@firebase/app-compat';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { StringFormat } from '../src/implementation/string';
import { TaskEvent, TaskState } from '../src/implementation/taskenums';

import { ReferenceCompat } from './reference';
import { StorageServiceCompat } from './service';
import * as types from '@firebase/storage-types';
import {
  Component,
  ComponentType,
  ComponentContainer,
  InstanceFactoryOptions
} from '@firebase/component';

import { name, version } from './package.json';

/**
 * Type constant for Firebase Storage.
 */
const STORAGE_TYPE = 'storage';

function factory(
  container: ComponentContainer,
  { instanceIdentifier: url }: InstanceFactoryOptions
): types.FirebaseStorage {
  // Dependencies
  const app = container.getProvider('app-compat').getImmediate();
  const storageExp = container
    .getProvider('storage-exp')
    .getImmediate({ identifier: url });

  const storageServiceCompat: StorageServiceCompat = new StorageServiceCompat(
    app,
    storageExp as any
  );
  return storageServiceCompat;
}

export function registerStorage(instance: _FirebaseNamespace): void {
  const namespaceExports = {
    // no-inline
    TaskState,
    TaskEvent,
    StringFormat,
    Storage: StorageServiceCompat,
    Reference: ReferenceCompat
  };
  instance.INTERNAL.registerComponent(
    new Component(STORAGE_TYPE, factory, ComponentType.PUBLIC)
      .setServiceProps(namespaceExports)
      .setMultipleInstances(true)
  );

  instance.registerVersion(name, version);
}

registerStorage((firebase as unknown) as _FirebaseNamespace);

/**
 * Define extension behavior for `registerStorage`
 */
declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    storage?: {
      (app?: FirebaseApp, url?: string): types.FirebaseStorage;
      Storage: typeof types.FirebaseStorage;

      StringFormat: {
        BASE64: types.StringFormat;
        BASE64URL: types.StringFormat;
        DATA_URL: types.StringFormat;
        RAW: types.StringFormat;
      };
      TaskEvent: {
        STATE_CHANGED: types.TaskEvent;
      };
      TaskState: {
        CANCELED: types.TaskState;
        ERROR: types.TaskState;
        PAUSED: types.TaskState;
        RUNNING: types.TaskState;
        SUCCESS: types.TaskState;
      };
    };
  }
  interface FirebaseApp {
    storage?(storageBucket?: string): types.FirebaseStorage;
  }
}
