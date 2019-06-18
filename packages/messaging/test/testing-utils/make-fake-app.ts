/**
 * @license
 * Copyright 2017 Google Inc.
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

import { FirebaseApp, FirebaseOptions } from '@firebase/app-types';

export function makeFakeApp(options: FirebaseOptions = {}): FirebaseApp {
  options = {
    apiKey: 'apiKey',
    projectId: 'projectId',
    authDomain: 'authDomain',
    messagingSenderId: '1234567890',
    databaseURL: 'databaseUrl',
    storageBucket: 'storageBucket',
    appId: '1:777777777777:web:d93b5ca1475efe57',
    ...options
  };
  return {
    name: 'appName',
    options,
    automaticDataCollectionEnabled: true,
    delete: async () => {},
    messaging: null as any
  };
}
