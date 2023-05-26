/**
 * The Firebase App Check Web SDK.
 *
 * @remarks
 * Firebase App Check does not work in a Node.js environment using `ReCaptchaV3Provider` or
 * `ReCaptchaEnterpriseProvider`, but can be used in Node.js if you use
 * `CustomProvider` and write your own attestation method.
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
import { registerVersion, _registerComponent } from '@firebase/app';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import { _AppCheckComponentName } from './public-types';
import { factory, internalFactory } from './factory';
import { _AppCheckInternalComponentName } from './types';
import { name, version } from '../package.json';

// Used by other Firebase packages.
export { _AppCheckInternalComponentName };

export * from './api';
export * from './public-types';

const APP_CHECK_NAME: _AppCheckComponentName = 'app-check';
const APP_CHECK_NAME_INTERNAL: _AppCheckInternalComponentName =
  'app-check-internal';
function registerAppCheck(): void {
  // The public interface
  _registerComponent(
    new Component(
      APP_CHECK_NAME,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const heartbeatServiceProvider = container.getProvider('heartbeat');
        return factory(app, heartbeatServiceProvider);
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
        const appCheck = container.getProvider('app-check').getImmediate();
        return internalFactory(appCheck);
      },
      ComponentType.PUBLIC
    ).setInstantiationMode(InstantiationMode.EXPLICIT)
  );

  registerVersion(name, version);
}

registerAppCheck();
