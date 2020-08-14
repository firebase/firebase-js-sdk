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

import { registerVersion, _registerComponent } from '@firebase/app-exp';
import { _FirebaseService } from '@firebase/app-types-exp';
import { Component, ComponentType } from '@firebase/component';
import { FirebaseInstallations } from '@firebase/installations-types-exp';
import { extractAppConfig } from '../helpers/extract-app-config';

import { name, version } from '../../package.json';

export function registerInstallations(): void {
  const installationsName = 'installations';

  _registerComponent(
    new Component(
      installationsName,
      container => {
        const app = container.getProvider('app').getImmediate();

        // Throws if app isn't configured properly.
        const appConfig = extractAppConfig(app);
        const platformLoggerProvider = container.getProvider('platform-logger');

        const installations: FirebaseInstallations = {
          appConfig,
          platformLoggerProvider
        };

        return installations;
      },
      ComponentType.PUBLIC
    )
  );

  registerVersion(name, version);
}
