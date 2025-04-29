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

import { _getProvider, FirebaseApp, getApp } from '@firebase/app';
import { FUNCTIONS_TYPE } from './constants';

import { Provider } from '@firebase/component';
import { Functions, HttpsCallableOptions, HttpsCallable } from './public-types';
import {
  FunctionsService,
  DEFAULT_REGION,
  connectFunctionsEmulator as _connectFunctionsEmulator,
  httpsCallable as _httpsCallable,
  httpsCallableFromURL as _httpsCallableFromURL
} from './service';
import {
  getModularInstance,
  getDefaultEmulatorHostnameAndPort
} from '@firebase/util';

export { FunctionsError } from './error';
export * from './public-types';

/**
 * Returns a {@link Functions} instance for the given app.
 * @param app - The {@link @firebase/app#FirebaseApp} to use.
 * @param regionOrCustomDomain - one of:
 *   a) The region the callable functions are located in (ex: us-central1)
 *   b) A custom domain hosting the callable functions (ex: https://mydomain.com)
 * @public
 */
export function getFunctions(
  app: FirebaseApp = getApp(),
  regionOrCustomDomain: string = DEFAULT_REGION
): Functions {
  // Dependencies
  const functionsProvider: Provider<'functions'> = _getProvider(
    getModularInstance(app),
    FUNCTIONS_TYPE
  );
  const functionsInstance = functionsProvider.getImmediate({
    identifier: regionOrCustomDomain
  });
  const emulator = getDefaultEmulatorHostnameAndPort('functions');
  if (emulator) {
    connectFunctionsEmulator(functionsInstance, ...emulator);
  }
  return functionsInstance;
}

/**
 * Modify this instance to communicate with the Cloud Functions emulator.
 *
 * Note: this must be called before this instance has been used to do any operations.
 *
 * @param host - The emulator host (ex: localhost)
 * @param port - The emulator port (ex: 5001)
 * @public
 */
export function connectFunctionsEmulator(
  functionsInstance: Functions,
  host: string,
  port: number,
): void {
  _connectFunctionsEmulator(
    getModularInstance<FunctionsService>(functionsInstance as FunctionsService),
    host,
    port
  );
}

/**
 * Returns a reference to the callable HTTPS trigger with the given name.
 * @param name - The name of the trigger.
 * @public
 */
export function httpsCallable<
  RequestData = unknown,
  ResponseData = unknown,
  StreamData = unknown
>(
  functionsInstance: Functions,
  name: string,
  options?: HttpsCallableOptions
): HttpsCallable<RequestData, ResponseData, StreamData> {
  return _httpsCallable<RequestData, ResponseData, StreamData>(
    getModularInstance<FunctionsService>(functionsInstance as FunctionsService),
    name,
    options
  );
}

/**
 * Returns a reference to the callable HTTPS trigger with the specified url.
 * @param url - The url of the trigger.
 * @public
 */
export function httpsCallableFromURL<
  RequestData = unknown,
  ResponseData = unknown,
  StreamData = unknown
>(
  functionsInstance: Functions,
  url: string,
  options?: HttpsCallableOptions
): HttpsCallable<RequestData, ResponseData, StreamData> {
  return _httpsCallableFromURL<RequestData, ResponseData, StreamData>(
    getModularInstance<FunctionsService>(functionsInstance as FunctionsService),
    url,
    options
  );
}
