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

import { FirebaseFunctions, HttpsCallable } from '@firebase/functions-types';
import {
  httpsCallable as httpsCallableExp,
  useFunctionsEmulator as useFunctionsEmulatorExp,
  HttpsCallableOptions,
  Functions as FunctionsServiceExp
} from '@firebase/functions-exp';
import { FirebaseApp, _FirebaseService } from '@firebase/app-compat';
import { FirebaseError } from '@firebase/util';

export class FunctionsService implements FirebaseFunctions, _FirebaseService {
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

  constructor(
    public app: FirebaseApp,
    readonly _delegate: FunctionsServiceExp
  ) {
    this._region = this._delegate.region;
    this._customDomain = this._delegate.customDomain;
  }
  httpsCallable(name: string, options?: HttpsCallableOptions): HttpsCallable {
    return httpsCallableExp(this._delegate, name, options);
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
    return useFunctionsEmulatorExp(this._delegate, match[1], Number(match[2]));
  }
  useEmulator(host: string, port: number): void {
    return useFunctionsEmulatorExp(this._delegate, host, port);
  }
}
