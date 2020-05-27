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

import { registerVersion } from '@firebase/app-exp';
import {
  Firestore,
  initializeFirestore,
  getFirestore
} from './src/api/database';
import { version } from '../package.json';
import { Component, ComponentType } from '@firebase/component';
import { _registerComponent } from '@firebase/app-exp';
import { makeConstructorPrivate } from '../src/util/api';

export const PublicFirestore = makeConstructorPrivate(
  Firestore,
  'Use getFirestore() instead.'
);

const firestoreNamespace = {
  Firestore: PublicFirestore,
  initializeFirestore,
  getFirestore
};

export function registerFirestore(): void {
  _registerComponent(
    new Component(
      'firestore/lite',
      container => {
        const app = container.getProvider('app-exp').getImmediate()!;
        return ((app, auth) => new Firestore(app, auth))(
          app,
          container.getProvider('auth-internal')
        );
      },
      ComponentType.PUBLIC
    ).setServiceProps({ ...firestoreNamespace })
  );
  registerVersion('firestore-lite', version, 'node');
}

registerFirestore();
