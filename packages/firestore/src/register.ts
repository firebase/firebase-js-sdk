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
} from '@firebase/app';
import { Component, ComponentType } from '@firebase/component';

import { name, version } from '../package.json';
import {
  FirebaseAppCheckTokenProvider,
  FirebaseAuthCredentialsProvider
} from '../src/api/credentials';
import { setSDKVersion } from '../src/core/version';

import { Firestore } from './api/database';
import { databaseIdFromApp } from './core/database_info';

export function registerFirestore(
  variant?: string,
  useFetchStreams = true
): void {
  setSDKVersion(SDK_VERSION);
  _registerComponent(
    new Component(
      'firestore',
      (container, { instanceIdentifier: databaseId, options: settings }) => {
        const app = container.getProvider('app').getImmediate()!;
        const firestoreInstance = new Firestore(
          new FirebaseAuthCredentialsProvider(
            container.getProvider('auth-internal')
          ),
          new FirebaseAppCheckTokenProvider(
            container.getProvider('app-check-internal')
          ),
          databaseIdFromApp(app, databaseId),
          app
        );
        settings = { useFetchStreams, ...settings };
        firestoreInstance._setSettings(settings);
        return firestoreInstance;
      },
      'PUBLIC' as ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );
  registerVersion(name, version, variant);
  // BUILD_TARGET will be replaced by values like esm5, esm2017, cjs5, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
