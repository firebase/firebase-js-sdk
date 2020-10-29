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

import firebase from '@firebase/app-compat';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import {
  Component,
  ComponentContainer,
  ComponentType
} from '@firebase/component';
import { RemoteConfigCompat } from './remoteConfig';
import { name as packageName, version } from '../package.json';

// TODO: move it to the future remote-config-compat-types package
declare module '@firebase/component' {
  interface NameServiceMapping {
    'remote-config-compat': RemoteConfigCompat;
  }
}

function registerRemoteConfigCompat(
  firebaseInstance: _FirebaseNamespace
): void {
  firebaseInstance.INTERNAL.registerComponent(
    new Component(
      'remote-config-compat',
      remoteConfigFactory,
      ComponentType.PUBLIC
    ).setMultipleInstances(true)
  );

  firebaseInstance.registerVersion(packageName, version);
}

function remoteConfigFactory(
  container: ComponentContainer,
  namespace?: string
): RemoteConfigCompat {
  // TODO: change 'app' to 'app-compat' before the official release
  const app = container.getProvider('app').getImmediate();
  // The following call will always succeed because rc `import {...} from '@firebase/remote-config-exp'`
  const remoteConfig = container.getProvider('remote-config-exp').getImmediate({
    identifier: namespace
  });

  return new RemoteConfigCompat(app, remoteConfig);
}

registerRemoteConfigCompat(firebase as _FirebaseNamespace);
