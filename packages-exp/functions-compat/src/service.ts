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
import { FirebaseFunctions, HttpsCallable } from '@firebase/functions-types';
import { HttpsCallableOptions, Functions } from '@firebase/functions-types-exp';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseError } from '@firebase/util';

export class FunctionsService implements FirebaseFunctions {
  private _functionsInstance: Functions;
  /**
   * For testing.
   * @internal
   */
  _region: string;
  /**
   * For testing.
   * @internal
   */
  _customDomain: string | null;

  constructor(public app: FirebaseApp, regionOrCustomDomain?: string) {
    this._functionsInstance = getFunctions(app, regionOrCustomDomain);
    this._region = this._functionsInstance.region;
    this._customDomain = this._functionsInstance.customDomain;
  }
  httpsCallable(name: string, options?: HttpsCallableOptions): HttpsCallable {
    return httpsCallableExp(this._functionsInstance, name, options);
  }
  /**
   * Deprecated in pre-modularized repo, does not exist in modularized
   * functions package, need to convert to "host" and "port" args that
   * `useFunctionsEmulatorExp` takes.
   * @deprecated
   */
  useFunctionsEmulator(origin: string): void {
    const match = origin.match('[a-zA-Z]+://([a-zA-Z0-9.-]+)(?::([0-9]+))?');
    if (match == null) {
      throw new FirebaseError(
        'functions',
        'No origin provided to useFunctionsEmulator()'
      );
    }
    if (match[2] == null) {
      throw new FirebaseError(
        'functions',
        'Port missing in origin provided to useFunctionsEmulator()'
      );
    }
    return useFunctionsEmulatorExp(
      this._functionsInstance,
      match[1],
      Number(match[2])
    );
  }
  useEmulator(host: string, port: number): void {
    return useFunctionsEmulatorExp(this._functionsInstance, host, port);
  }
}
