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

import { firebase } from '@firebase/app-compat';
import { name, version } from '../package.json';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseInstallations as FirebaseInstallationsCompat } from '@firebase/installations-types';
import { FirebaseApp } from '@firebase/app-types';
import { InstallationsCompat } from './installationsCompat';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'app-compat': FirebaseApp;
    'installations-compat': FirebaseInstallationsCompat;
  }
}

function registerInstallations(instance: _FirebaseNamespace): void {
  instance.INTERNAL.registerComponent(
    new Component(
      'installations-compat',
      container => {
        const app = container.getProvider('app-compat').getImmediate()!;
        const installations = container
          .getProvider('installations-exp')
          .getImmediate()!;
        return new InstallationsCompat(app, installations);
      },
      ComponentType.PUBLIC
    )
  );

  instance.registerVersion(name, version);
}

registerInstallations(firebase as _FirebaseNamespace);
