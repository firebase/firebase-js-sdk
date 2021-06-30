/**
 * @license
 * Copyright 2021 Google LLC
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

import firebase, {
  _FirebaseNamespace,
  FirebaseApp
} from '@firebase/app-compat';
import { name, version } from '../package.json';
import {
  Component,
  ComponentContainer,
  ComponentType,
  InstanceFactory
} from '@firebase/component';
import { AppCheckService } from './service';
import { FirebaseAppCheck } from '../../../packages/app-check-types';

declare module '@firebase/component' {
  interface NameServiceMapping {
    'appCheck-compat': AppCheckService;
  }
}

const factory: InstanceFactory<'appCheck-compat'> = (
  container: ComponentContainer
) => {
  // Dependencies
  const app = container.getProvider('app-compat').getImmediate();
  const appCheckServiceExp = container
    .getProvider('app-check-exp')
    .getImmediate();

  return new AppCheckService(app as FirebaseApp, appCheckServiceExp);
};

export function registerAppCheck(): void {
  (firebase as _FirebaseNamespace).INTERNAL.registerComponent(
    new Component('appCheck-compat', factory, ComponentType.PUBLIC)
  );
}

registerAppCheck();
firebase.registerVersion(name, version);

/**
 * Define extension behavior of `registerAppCheck`
 */
declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    appCheck(app?: FirebaseApp): FirebaseAppCheck;
  }
  interface FirebaseApp {
    appCheck(): FirebaseAppCheck;
  }
}
