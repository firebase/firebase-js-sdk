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

import { FirebaseApp } from '@firebase/app-types';
import { RemoteConfig } from '@firebase/remote-config-types-exp';

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
    automaticDataCollectionEnabled: true,
    delete: async () => {}
  };
}

export function getFakeModularRemoteConfig(): RemoteConfig {
  return {
    defaultConfig: {},
    fetchTimeMillis: 0,
    lastFetchStatus: 'no-fetch-yet',
    settings: {
      fetchTimeoutMillis: 0,
      minimumFetchIntervalMillis: 0
    }
  };
}
