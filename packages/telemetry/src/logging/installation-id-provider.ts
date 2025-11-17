/**
 * @license
 * Copyright 2025 Google LLC
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

import { DynamicLogAttributeProvider, LogEntryAttribute } from '../types';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

/**
 * An implementation of DynamicHeaderProvider that can be used to provide App Check token headers.
 *
 * @internal
 */
export class InstallationIdProvider implements DynamicLogAttributeProvider {
  private _fid: string | undefined;

  constructor(private installationsProvider: _FirebaseInstallationsInternal) {}

  async getAttribute(): Promise<LogEntryAttribute | null> {
    if (this._fid) {
      return ['user.id', this._fid];
    }

    const fid = await this.installationsProvider.getId();
    if (!fid) {
      return null;
    }

    this._fid = fid;
    return ['user.id', fid];
  }
}
