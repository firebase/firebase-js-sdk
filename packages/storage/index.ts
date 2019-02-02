/**
 * @license
 * Copyright 2017 Google Inc.
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
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseServiceFactory } from '@firebase/app-types/private';
import { StringFormat } from './src/implementation/string';
import { TaskEvent } from './src/implementation/taskenums';
import { TaskState } from './src/implementation/taskenums';
import { XhrIoPool } from './src/implementation/xhriopool';
import { Reference } from './src/reference';
import { Service } from './src/service';
import * as types from '@firebase/storage-types';

/**
 * Type constant for Firebase Storage.
 */
const STORAGE_TYPE = 'storage';

function factory(
  app: FirebaseApp,
  unused: any,
  opt_url?: string
): types.FirebaseStorage {
  return new Service(app, new XhrIoPool(), opt_url) as any;
}

export function registerStorage(instance) {
  let namespaceExports = {
    // no-inline
    TaskState: TaskState,
    TaskEvent: TaskEvent,
    StringFormat: StringFormat,
    Storage: Service,
    Reference: Reference
  };
  instance.INTERNAL.registerService(
    STORAGE_TYPE,
    factory as FirebaseServiceFactory,
    namespaceExports,
    undefined,
    // Allow multiple storage instances per app.
    true
  );
}

registerStorage(firebase);

/**
 * Define extension behavior for `registerStorage`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    storage?: {
      (app?: FirebaseApp): types.FirebaseStorage;
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
