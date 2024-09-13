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

import { FirebaseOptions, FirebaseApp } from '@firebase/app';
import { Provider, ComponentContainer } from '@firebase/component';
import { FirebaseAuthInternalName } from '@firebase/auth-interop-types';
import { AppCheckInternalComponentName } from '@firebase/app-check-interop-types';
import { FunctionsService } from '../src/service';
import { connectFunctionsEmulator } from '../src/api';
import { MessagingInternalComponentName } from '../../../packages/messaging-interop-types';

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
    automaticDataCollectionEnabled: true
  };
}

export function createTestService(
  app: FirebaseApp,
  region?: string,
  authProvider = new Provider<FirebaseAuthInternalName>(
    'auth-internal',
    new ComponentContainer('test')
  ),
  messagingProvider = new Provider<MessagingInternalComponentName>(
    'messaging-internal',
    new ComponentContainer('test')
  ),
  appCheckProvider = new Provider<AppCheckInternalComponentName>(
    'app-check-internal',
    new ComponentContainer('test')
  )
): FunctionsService {
  const functions = new FunctionsService(
    app,
    authProvider,
    messagingProvider,
    appCheckProvider,
    region,
    fetch
  );
  const useEmulator = !!process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN;
  if (useEmulator) {
    const url = new URL(process.env.FIREBASE_FUNCTIONS_EMULATOR_ORIGIN!);
    connectFunctionsEmulator(
      functions,
      url.hostname,
      Number.parseInt(url.port, 10)
    );
  }
  return functions;
}
