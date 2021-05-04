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

import { FirebaseAppCheck, AppCheckProvider } from '@firebase/app-check-types';
import { activate } from './api';
import { FirebaseApp } from '@firebase/app-types';
import { FirebaseAppCheckInternal } from '@firebase/app-check-interop-types';
import {
  getToken,
  addTokenListener,
  removeTokenListener
} from './internal-api';

export function factory(app: FirebaseApp): FirebaseAppCheck {
  return {
    activate: (siteKeyOrProvider: string | AppCheckProvider) =>
      activate(app, siteKeyOrProvider)
  };
}

export function internalFactory(app: FirebaseApp): FirebaseAppCheckInternal {
  return {
    getToken: forceRefresh => getToken(app, forceRefresh),
    addTokenListener: listener => addTokenListener(app, listener),
    removeTokenListener: listener => removeTokenListener(app, listener)
  };
}
