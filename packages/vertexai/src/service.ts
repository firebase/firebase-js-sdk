/**
 * @license
 * Copyright 2024 Google LLC
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

import { FirebaseApp, _FirebaseService } from '@firebase/app';
import { VertexAI } from './public-types';
import {
  AppCheckInternalComponentName,
  FirebaseAppCheckInternal
} from '@firebase/app-check-interop-types';
import { Provider } from '@firebase/component';
import { DEFAULT_LOCATION } from './constants';

export class VertexAIService implements VertexAI, _FirebaseService {
  appCheck: FirebaseAppCheckInternal | null;
  location: string;

  constructor(
    public app: FirebaseApp,
    appCheckProvider?: Provider<AppCheckInternalComponentName>
  ) {
    const appCheck = appCheckProvider?.getImmediate({ optional: true });
    this.appCheck = appCheck || null;
    // TODO: add in user-set location option when that feature is available
    this.location = DEFAULT_LOCATION;
  }

  _delete(): Promise<void> {
    return Promise.resolve();
  }
}
