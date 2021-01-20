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
  _getProvider,
  SDK_VERSION
  // eslint-disable-next-line import/no-extraneous-dependencies
} from '@firebase/app-exp';

import { XhrIoPool } from '../src/implementation/xhriopool';
import { StorageService } from '../src/service';
import {
  Component,
  ComponentType,
  ComponentContainer,
  Provider
} from '@firebase/component';

import { name, version } from '../package.json';
import { FirebaseApp } from '@firebase/app-types-exp';

export { ref, StorageService } from '../src/service';
export {
  uploadBytes,
  uploadBytesResumable,
  uploadString,
  getMetadata,
  updateMetadata,
  list,
  listAll,
  getDownloadURL,
  deleteObject,
  StorageReference
} from '../src/reference';
export { Metadata } from '../src/metadata';
export { ListOptions, ListResult } from '../src/list';
export { UploadTask } from '../src/task';
export { UploadResult, UploadTaskSnapshot } from '../src/tasksnapshot';
export { StringFormat } from '../src/implementation/string';

/**
 * Type constant for Firebase Storage.
 */
const STORAGE_TYPE = 'storage-exp';

/**
 * Gets a Firebase StorageService instance for the given Firebase app.
 * @public
 * @param app - Firebase app to get Storage instance for.
 * @returns A Firebase StorageService instance.
 */
export function getStorage(app: FirebaseApp): StorageService {
  // Dependencies
  const storageProvider: Provider<'storage-exp'> = _getProvider(
    app,
    STORAGE_TYPE
  );
  const storageInstance = storageProvider.getImmediate();
  return storageInstance;
}

function factory(container: ComponentContainer, url?: string): StorageService {
  const app = container.getProvider('app-exp').getImmediate();
  const authProvider = container.getProvider('auth-internal');

  return (new StorageService(
    app,
    authProvider,
    new XhrIoPool(),
    url,
    SDK_VERSION
  ) as unknown) as StorageService;
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

declare module '@firebase/component' {
  interface NameServiceMapping {
    'storage-exp': StorageService;
  }
}
