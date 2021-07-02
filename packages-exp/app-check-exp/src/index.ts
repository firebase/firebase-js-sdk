/**
 * Firebase App Check
 *
 * @packageDocumentation
 */

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
import { registerVersion, _registerComponent } from '@firebase/app-exp';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import { _AppCheckComponentName } from './public-types';
import { factory, internalFactory } from './factory';
import { initializeDebugMode } from './debug';
import { _AppCheckInternalComponentName } from './types';
import { name, version } from '../package.json';

// Used by other Firebase packages.
export { _AppCheckInternalComponentName };

export * from './api';
export * from './public-types';

const APP_CHECK_NAME: _AppCheckComponentName = 'app-check-exp';
const APP_CHECK_NAME_INTERNAL: _AppCheckInternalComponentName =
  'app-check-internal';
function registerAppCheck(): void {
  // The public interface
  _registerComponent(
    new Component(
      APP_CHECK_NAME,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app-exp').getImmediate();
        const platformLoggerProvider = container.getProvider('platform-logger');
        return factory(app, platformLoggerProvider);
      },
      ComponentType.PUBLIC
    )
      .setInstantiationMode(InstantiationMode.EXPLICIT)
      /**
       * Initialize app-check-internal after app-check is initialized to make AppCheck available to
       * other Firebase SDKs
       */
      .setInstanceCreatedCallback(
        (container, _identifier, _appcheckService) => {
          container.getProvider(APP_CHECK_NAME_INTERNAL).initialize();
        }
      )
  );

  // The internal interface used by other Firebase products
  _registerComponent(
    new Component(
      APP_CHECK_NAME_INTERNAL,
      container => {
        const appCheck = container.getProvider('app-check-exp').getImmediate();
        return internalFactory(appCheck);
      },
      ComponentType.PUBLIC
    ).setInstantiationMode(InstantiationMode.EXPLICIT)
  );

  registerVersion(name, version);
}

registerAppCheck();
initializeDebugMode();
