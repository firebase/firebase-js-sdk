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

import { Provider } from '@firebase/component';
import { DynamicLogAttributeProvider, LogEntryAttribute } from '../types';
import { _FirebaseInstallationsInternal } from '@firebase/installations';
import { LOG_ENTRY_ATTRIBUTE_KEYS } from '../constants';

/**
 * Allows logging to include the client's installation ID.
 *
 * @internal
 */
export class InstallationIdProvider implements DynamicLogAttributeProvider {
  private installations: _FirebaseInstallationsInternal | null;
  private _iid: string | undefined;

  constructor(installationsProvider: Provider<'installations-internal'>) {
    this.installations = installationsProvider?.getImmediate({
      optional: true
    });
    if (!this.installations) {
      void installationsProvider
        ?.get()
        .then(installations => (this.installations = installations))
        .catch();
    }
  }

  async getAttribute(): Promise<LogEntryAttribute | null> {
    if (!this.installations) {
      return null;
    }
    if (this._iid) {
      return [LOG_ENTRY_ATTRIBUTE_KEYS.USER_ID, this._iid];
    }

    const iid = await this.installations.getId();
    if (!iid) {
      return null;
    }

    this._iid = iid;
    return [LOG_ENTRY_ATTRIBUTE_KEYS.USER_ID, iid];
  }
}
