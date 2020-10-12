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

import { _getProvider } from '@firebase/app-exp';
import { FirebaseApp } from '@firebase/app-types-exp';
import { FUNCTIONS_TYPE } from './constants';

import { Provider } from '@firebase/component';
import {
  Functions,
  HttpsCallableOptions,
  HttpsCallable
} from '@firebase/functions-types-exp';
import {
  FunctionsService,
  DEFAULT_REGION,
  useFunctionsEmulator as _useFunctionsEmulator,
  httpsCallable as _httpsCallable
} from './service';

/**
 * Returns a Functions instance for the given app.
 * @param app - The FirebaseApp to use.
 * @param regionOrCustomDomain - one of:
 *   a) The region the callable functions are located in (ex: us-central1)
 *   b) A custom domain hosting the callable functions (ex: https://mydomain.com)
 * @public
 */
export function getFunctions(
  app: FirebaseApp,
  regionOrCustomDomain: string = DEFAULT_REGION
): Functions {
  // Dependencies
  const functionsProvider: Provider<'functions'> = _getProvider(
    app,
    FUNCTIONS_TYPE
  );
  const functionsInstance = functionsProvider.getImmediate({
    identifier: regionOrCustomDomain
  });
  return functionsInstance;
}

/**
 * Modify this instance to communicate with the Cloud Functions emulator.
 *
 * Note: this must be called before this instance has been used to do any operations.
 *
 * @param host the emulator host (ex: localhost)
 * @param port the emulator port (ex: 5001)
 * @public
 */
export function useFunctionsEmulator(
  functionsInstance: Functions,
  host: string,
  port: number
): void {
  _useFunctionsEmulator(functionsInstance as FunctionsService, host, port);
}

/**
 * Returns a reference to the callable https trigger with the given name.
 * @param name - The name of the trigger.
 * @public
 */
export function httpsCallable(
  functionsInstance: Functions,
  name: string,
  options?: HttpsCallableOptions
): HttpsCallable {
  return _httpsCallable(functionsInstance as FunctionsService, name, options);
}
