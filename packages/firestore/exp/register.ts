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
} from '@firebase/app-exp';
import { Component, ComponentType } from '@firebase/component';

import { name, version } from '../package.json';
import { setSDKVersion } from '../src/core/version';
import { FirebaseFirestore } from '../src/exp/database';
import { PrivateSettings } from '../src/lite/settings';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'firestore-exp': FirebaseFirestore;
  }
}

export function registerFirestore(variant?: string): void {
  setSDKVersion(SDK_VERSION);
  _registerComponent(
    new Component(
      'firestore-exp',
      (container, { options: settings }: { options?: PrivateSettings }) => {
        const app = container.getProvider('app-exp').getImmediate()!;
        const firestoreInstance = new FirebaseFirestore(
          app,
          container.getProvider('auth-internal')
        );
        settings = { useFetchStreams: false, ...settings };
        firestoreInstance._setSettings(settings);
        return firestoreInstance;
      },
      ComponentType.PUBLIC
    )
  );
  registerVersion(name, version, variant);
}
