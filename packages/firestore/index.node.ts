/**
 * @license
 * Copyright 2017 Google LLC
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
import { FirebaseNamespace } from '@firebase/app-types';

import { Firestore } from './src/api/database';
import {
  MultiTabOfflineComponentProvider,
  OnlineComponentProvider
} from './src/core/component_provider';
import { configureForFirebase } from './src/config';

import './register-module';

import { name, version } from './package.json';

/**
 * Registers the main Firestore Node build with the components framework.
 * Persistence can be enabled via `firebase.firestore().enablePersistence()`.
 */
export function registerFirestore(instance: FirebaseNamespace): void {
  configureForFirebase(instance, (app, auth) => {
    const onlineComponentProvider = new OnlineComponentProvider();
    const offlineComponentProvider = new MultiTabOfflineComponentProvider(
      onlineComponentProvider
    );
    return new Firestore(
      app,
      auth,
      offlineComponentProvider,
      onlineComponentProvider
    );
  });
  instance.registerVersion(name, version, 'node');
}

registerFirestore(firebase);
