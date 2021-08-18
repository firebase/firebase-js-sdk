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

import firebase, { _FirebaseNamespace } from '@firebase/app-compat';
import {
  Component,
  ComponentContainer,
  ComponentType
} from '@firebase/component';
import { PerformanceCompatImpl } from './performance';
import { name as packageName, version } from '../package.json';
import { FirebasePerformance as FirebasePerformanceCompat } from '@firebase/performance-types';

// TODO: move it to the future performance-compat-types package
declare module '@firebase/component' {
  interface NameServiceMapping {
    'performance-compat': FirebasePerformanceCompat;
  }
}

function registerPerformanceCompat(firebaseInstance: _FirebaseNamespace): void {
  firebaseInstance.INTERNAL.registerComponent(
    new Component(
      'performance-compat',
      performanceFactory,
      ComponentType.PUBLIC
    )
  );

  firebaseInstance.registerVersion(packageName, version);
}

function performanceFactory(
  container: ComponentContainer
): PerformanceCompatImpl {
  const app = container.getProvider('app-compat').getImmediate();
  // The following call will always succeed.
  const performance = container.getProvider('performance-exp').getImmediate();

  return new PerformanceCompatImpl(app, performance);
}

registerPerformanceCompat(firebase as _FirebaseNamespace);

declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    performance: {
      (app?: FirebaseApp): FirebasePerformanceCompat;
    };
  }
  interface FirebaseApp {
    performance(): FirebasePerformanceCompat;
  }
}
