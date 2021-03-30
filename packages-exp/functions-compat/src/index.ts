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

import firebase, { FirebaseApp } from '@firebase/app-compat';
import { name, version } from '../package.json';
import { registerFunctions } from './register';
import * as types from '@firebase/functions-types';
import { Functions as FirebaseFunctionsExp } from '@firebase/functions-exp';

declare module '@firebase/functions-exp' {
  export function getFunctions(
    app: FirebaseApp,
    regionOrCustomDomain?: string
  ): FirebaseFunctionsExp;

  export function httpsCallable<RequestData = unknown, ResponseData = unknown>(
    functionsInstance: types.FirebaseFunctions,
    name: string,
    options?: HttpsCallableOptions
  ): HttpsCallable<RequestData, ResponseData>;

  export function useFunctionsEmulator(
    functionsInstance: types.FirebaseFunctions,
    host: string,
    port: number
  ): void;
}

registerFunctions();
firebase.registerVersion(name, version);

declare module '@firebase/app-compat' {
  interface FirebaseNamespace {
    functions?: {
      (app?: FirebaseApp): types.FirebaseFunctions;
      Functions: typeof types.FirebaseFunctions;
    };
  }
  interface FirebaseApp {
    functions?(regionOrCustomDomain?: string): types.FirebaseFunctions;
  }
}
