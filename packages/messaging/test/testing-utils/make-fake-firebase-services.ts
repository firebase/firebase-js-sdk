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
import { FirebaseInstallations } from '@firebase/installations-types';
import { FirebaseAnalyticsInternal } from '@firebase/analytics-interop-types';
import { Provider, ComponentContainer } from '@firebase/component';
import { FirebaseInternalServices } from '../../src/interfaces/internal-services';

export function makeFakeFirebaseInternalServices(
  options: FirebaseOptions = {}
): FirebaseInternalServices {
  return {
    app: makeFakeApp(options),
    installations: makeFakeInstallations(),
    analyticsProvider: makeFakeAnalyticsProvider()
  };
}

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
    messaging: null as any,
    installations: null as any
  };
}

export function makeFakeInstallations(): FirebaseInstallations {
  return {
    getId: () => Promise.resolve('FID'),
    getToken: () => Promise.resolve('authToken'),
    delete: () => Promise.resolve()
  };
}

export function makeFakeAnalyticsProvider(): Provider<
  FirebaseAnalyticsInternal
> {
  return new Provider<FirebaseAnalyticsInternal>(
    'analytics-interop',
    new ComponentContainer('test')
  );
}
