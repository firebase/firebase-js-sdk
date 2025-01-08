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

import { FirebaseApp, FirebaseServerApp } from '@firebase/app';
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

export const FAKE_INSTALLATIONS_ID = 'abc123';

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

export function getFakeServerApp(
  installationsAuthToken: string | null = null
): FirebaseServerApp {
  const app = getFakeApp() as any;
  app.settings = {
    automaticDataCollectionEnabled: true
  };
  if (installationsAuthToken !== null) {
    app.settings.installationsAuthToken = installationsAuthToken;
    app.installationsId = FAKE_INSTALLATIONS_ID;
  }
  return app;
}

export function getFakeAppConfig(
  customValues: Partial<AppConfig> = {}
): AppConfig {
  return { ...extractAppConfig(getFakeApp()), ...customValues };
}

export function getFakeInstallations(
  app?: FirebaseApp
): FirebaseInstallationsImpl {
  const container = new ComponentContainer('test');
  container.addComponent(
    new Component(
      'heartbeat',
      () => ({
        getHeartbeatsHeader: () => Promise.resolve('a/1.2.3 b/2.3.4'),
        triggerHeartbeat: () => Promise.resolve()
      }),
      ComponentType.PRIVATE
    )
  );
  const configuredApp: FirebaseApp = app ? app : getFakeApp();
  return {
    app: configuredApp,
    appConfig: getFakeAppConfig(),
    heartbeatServiceProvider: container.getProvider('heartbeat'),
    _delete: () => {
      return Promise.resolve();
    }
  };
}
