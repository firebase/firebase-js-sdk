/**
 * @license
 * Copyright 2026 Google LLC
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
import { AttributeValue } from '@opentelemetry/api';
import { _FirebaseInstallationsInternal } from '@firebase/installations';

export const ATTR_KEY_INSTALLATION_ID = 'app.installation.id';

type Attribute = Record<string, AttributeValue>;

/**
 * A store for Crashlytics specific attributes for telemetry data.
 */
export class AttributesStore {
  private installations: _FirebaseInstallationsInternal | null;
  private _iid: string | undefined;

  constructor(installationsProvider?: Provider<'installations-internal'>) {
    this.installations =
      installationsProvider?.getImmediate({
        optional: true
      }) ?? null;
    if (!this.installations) {
      void installationsProvider
        ?.get()
        .then(installations => (this.installations = installations))
        .catch(() => {});
    }
  }

  /**
   * Returns an attribute object with installation id.
   *
   * @returns an attribute object with installation id, or null if installation id is not available
   */
  async getInstallationIdAttribute(): Promise<Attribute | null> {
    if (!this.installations) {
      return null;
    }
    if (this._iid) {
      return {
        [ATTR_KEY_INSTALLATION_ID]: this._iid
      };
    }

    const iid = await this.installations.getId();
    if (!iid) {
      return null;
    }

    this._iid = iid;
    return {
      [ATTR_KEY_INSTALLATION_ID]: iid
    };
  }
}
