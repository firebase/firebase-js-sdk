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

import { FirebaseInstallations } from '@firebase/installations-types-exp';
import { FirebaseInstallations as FirebaseInstallationsCompat } from '@firebase/installations-types';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseService } from '@firebase/app-types/private';
import {
  deleteInstallations,
  getId,
  getToken,
  IdChangeCallbackFn,
  IdChangeUnsubscribeFn,
  onIdChange
} from '@firebase/installations-exp';

export class InstallationsCompat
  implements FirebaseInstallationsCompat, FirebaseService {
  constructor(
    public app: FirebaseApp,
    private _installations: FirebaseInstallations
  ) {}

  getId(): Promise<string> {
    return getId(this._installations);
  }
  getToken(forceRefresh?: boolean): Promise<string> {
    return getToken(this._installations, forceRefresh);
  }
  delete(): Promise<void> {
    return deleteInstallations(this._installations);
  }
  onIdChange(callback: IdChangeCallbackFn): IdChangeUnsubscribeFn {
    return onIdChange(this._installations, callback);
  }
}
