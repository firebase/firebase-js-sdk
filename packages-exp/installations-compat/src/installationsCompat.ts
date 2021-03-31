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

import { FirebaseInstallations as FirebaseInstallationsCompat } from '@firebase/installations-types';
import { FirebaseApp, _FirebaseService } from '@firebase/app-compat';
import {
  FirebaseInstallations,
  deleteInstallations,
  getId,
  getToken,
  IdChangeCallbackFn,
  IdChangeUnsubscribeFn,
  onIdChange
} from '@firebase/installations-exp';

export class InstallationsCompat
  implements FirebaseInstallationsCompat, _FirebaseService {
  constructor(
    public app: FirebaseApp,
    readonly _delegate: FirebaseInstallations
  ) {}

  getId(): Promise<string> {
    return getId(this._delegate);
  }
  getToken(forceRefresh?: boolean): Promise<string> {
    return getToken(this._delegate, forceRefresh);
  }
  delete(): Promise<void> {
    return deleteInstallations(this._delegate);
  }
  onIdChange(callback: IdChangeCallbackFn): IdChangeUnsubscribeFn {
    return onIdChange(this._delegate, callback);
  }
}
