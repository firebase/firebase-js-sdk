/**
 * @license
 * Copyright 2017 Google LLC
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
import firebase from '@firebase/app';
import { _FirebaseNamespace } from '@firebase/app-types/private';
import {
  Component,
  ComponentType,
  InstantiationMode
} from '@firebase/component';
import {
  FirebaseAppCheck,
  AppCheckComponentName
} from '@firebase/app-check-types';
import { factory, internalFactory } from './factory';
import { ReCAPTCHAV3Provider } from './providers';
import { initializeDebugMode } from './debug';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { name, version } from '../package.json';

const APP_CHECK_NAME: AppCheckComponentName = 'appCheck';
const APP_CHECK_NAME_INTERNAL: AppCheckInternalComponentName =
  'app-check-internal';
function registerAppCheck(firebase: _FirebaseNamespace): void {
  // The public interface
  firebase.INTERNAL.registerComponent(
    new Component(
      APP_CHECK_NAME,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const platformLoggerProvider = container.getProvider('platform-logger');
        return factory(app, platformLoggerProvider);
      },
      ComponentType.PUBLIC
    )
      .setServiceProps({
        ReCAPTCHAV3Provider
      })
      /**
       * AppCheck can only be initialized by explicitly calling firebase.appCheck()
       * We don't want firebase products that consume AppCheck to gate on AppCheck
       * if the user doesn't intend them to, just because the AppCheck component
       * is registered.
       */
      .setInstantiationMode(InstantiationMode.EXPLICIT)
      /**
       * Because all firebase products that depend on app-check depend on app-check-internal directly,
       * we need to initialize app-check-internal after app-check is initialized to make it
       * available to other firebase products.
       */
      .setInstanceCreatedCallback(
        (container, _instanceIdentifier, _instance) => {
          const appCheckInternalProvider = container.getProvider(
            APP_CHECK_NAME_INTERNAL
          );
          appCheckInternalProvider.initialize();
        }
      )
  );

  // The internal interface used by other Firebase products
  firebase.INTERNAL.registerComponent(
    new Component(
      APP_CHECK_NAME_INTERNAL,
      container => {
        // getImmediate for FirebaseApp will always succeed
        const app = container.getProvider('app').getImmediate();
        const platformLoggerProvider = container.getProvider('platform-logger');
        return internalFactory(app, platformLoggerProvider);
      },
      ComponentType.PUBLIC
    ).setInstantiationMode(InstantiationMode.EXPLICIT)
  );

  firebase.registerVersion(name, version);
}

registerAppCheck(firebase as _FirebaseNamespace);
initializeDebugMode();

/**
 * Define extension behavior of `registerAnalytics`
 */
declare module '@firebase/app-types' {
  interface FirebaseNamespace {
    appCheck(app?: FirebaseApp): FirebaseAppCheck;
  }
  interface FirebaseApp {
    appCheck(): FirebaseAppCheck;
  }
}
