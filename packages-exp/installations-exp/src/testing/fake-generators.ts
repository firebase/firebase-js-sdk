/**
 * @license
 * Copyright 2019 Google LLC
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

import { FirebaseApp } from '@firebase/app-types-exp';
import {
  Component,
  ComponentContainer,
  ComponentType
} from '@firebase/component';
import { extractAppConfig } from '../helpers/extract-app-config';
import {
  FirebaseInstallationsImpl,
  AppConfig
} from '../interfaces/installation-impl';

export function getFakeApp(): FirebaseApp {
  return {
    name: 'appName',
    options: {
      apiKey: 'apiKey',
      projectId: 'projectId',
      authDomain: 'authDomain',
      messagingSenderId: 'messagingSenderId',
      databaseURL: 'databaseUrl',
      storageBucket: 'storageBucket',
      appId: '1:777777777777:web:d93b5ca1475efe57'
    },
    automaticDataCollectionEnabled: true
  };
}

export function getFakeAppConfig(
  customValues: Partial<AppConfig> = {}
): AppConfig {
  return { ...extractAppConfig(getFakeApp()), ...customValues };
}

export function getFakeInstallations(): FirebaseInstallationsImpl {
  const container = new ComponentContainer('test');
  container.addComponent(
    new Component(
      'platform-logger',
      () => ({ getPlatformInfoString: () => 'a/1.2.3 b/2.3.4' }),
      ComponentType.PRIVATE
    )
  );

  return {
    app: getFakeApp(),
    appConfig: getFakeAppConfig(),
    platformLoggerProvider: container.getProvider('platform-logger'),
    _delete: () => {
      return Promise.resolve();
    }
  };
}
