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

import {
  httpsCallable as httpsCallableExp,
  useFunctionsEmulator as useFunctionsEmulatorExp,
  getFunctions
} from '@firebase/functions-exp';
import { FirebaseFunctions } from '@firebase/functions-types';
import { HttpsCallableOptions } from '@firebase/functions-types-exp';
import { FirebaseApp } from '@firebase/app-types';

export class FunctionsService implements FirebaseFunctions {
  private functionsInstance;
  constructor(public app: FirebaseApp, public region: string) {
    this.functionsInstance = getFunctions(app);
  }
  httpsCallable(name: string, options: HttpsCallableOptions) {
    return httpsCallableExp(this.functionsInstance, name, options);
  }
  useFunctionsEmulator(origin: string) {
    return useFunctionsEmulatorExp(this.functionsInstance, origin);
  }
}
