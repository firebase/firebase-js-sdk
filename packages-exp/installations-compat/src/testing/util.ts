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

import { FirebaseApp } from '@firebase/app-types';
import { FirebaseInstallations } from '@firebase/installations-types-exp';

const appName = 'testApp';
const apiKey = 'AIzaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaA';
const projectId = 'fis-test-app';
const appId = '1:777777777777:web:aaaaaaaaaaaaaaaa';

export function getFakeApp(): FirebaseApp {
  return {
    name: appName,
    options: {
      apiKey,
      projectId,
      authDomain: 'authDomain',
      messagingSenderId: 'messagingSenderId',
      databaseURL: 'databaseUrl',
      storageBucket: 'storageBucket',
      appId
    },
    automaticDataCollectionEnabled: true,
    delete: async () => {}
  };
}

export function getFakeInstallations(): FirebaseInstallations {
  return {
    app: getFakeApp(),
    appConfig: {
      appName,
      projectId,
      apiKey,
      appId
    },
    platformLoggerProvider: null,
    _delete: () => Promise.resolve()
  };
}
