/**
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
import { StringFormat } from './storage/implementation/string';
import { TaskEvent } from './storage/implementation/taskenums';
import { TaskState } from './storage/implementation/taskenums';
import { XhrIoPool } from './storage/implementation/xhriopool';
import { Reference } from './storage/reference';
import { Service } from './storage/service';
import firebase from './app';
import { FirebaseApp, FirebaseServiceFactory } from './app/firebase_app';
/**
 * Type constant for Firebase Storage.
 */
const STORAGE_TYPE = 'storage';

function factory(app: FirebaseApp, unused: any, opt_url?: string): Service {
  return new Service(app, new XhrIoPool(), opt_url);
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
