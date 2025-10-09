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

import { DynamicHeaderProvider } from '../public-types';
import { Provider } from '@firebase/component';
import {
  FirebaseAppCheckInternal,
  AppCheckInternalComponentName
} from '@firebase/app-check-interop-types';

export class AppCheckProvider implements DynamicHeaderProvider {
  appCheck: FirebaseAppCheckInternal | null;

  constructor(appCheckProvider: Provider<AppCheckInternalComponentName>) {
    this.appCheck = appCheckProvider?.getImmediate({ optional: true });
    if (!this.appCheck) {
      void appCheckProvider
        ?.get()
        .then(appCheck => (this.appCheck = appCheck))
        .catch();
    }
  }

  async getHeader(): Promise<Record<string, string> | null> {
    if (!this.appCheck) {
      return null;
    }

    const appCheckToken = await this.appCheck.getToken();
    // If the error field is defined, the token field will be populated with a dummy token
    if (!appCheckToken || !!appCheckToken.error) {
      return null;
    }

    return {'X-Firebase-AppCheck': appCheckToken.token};
  }
}