/**
 * @license
 * Copyright 2025 Google LLC
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

import { _registerComponent, registerVersion } from '@firebase/app';
import { TestType } from './types/index';
import { Component, ComponentType } from '@firebase/component';
import { TELEMETRY_TYPE } from './constants';
import { name, version } from '../package.json';
import { TelemetryService } from './service';

export function testFxn(): number {
  const _thing: TestType = {};
  console.log('hi');
  return 42;
}

declare module '@firebase/component' {
  interface NameServiceMapping {
    [TELEMETRY_TYPE]: TelemetryService;
  }
}

export function registerTelemetry(): void {
  _registerComponent(
    new Component(
      TELEMETRY_TYPE,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        return new TelemetryService(app);
      },
      ComponentType.PUBLIC
    )
  );

  registerVersion(name, version, 'node');
  // BUILD_TARGET will be replaced by values like esm, cjs, etc during the compilation
  registerVersion(name, version, '__BUILD_TARGET__');
}
