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
import { configureForFirebase } from './src/platform/config';
import './register-module';
import './src/platform_browser/browser_init';

import { FirebaseNamespace } from '@firebase/app-types';

import { name, version } from './package.json';
import {
  PersistenceFirestore,
  PublicPersistenceFirestore
} from './src/api/persistence';

export function registerFirestore(instance: FirebaseNamespace): void {
  configureForFirebase(
    instance,
    PublicPersistenceFirestore,
    PersistenceFirestore
  );
  instance.registerVersion(name, version);
}

registerFirestore(firebase);
