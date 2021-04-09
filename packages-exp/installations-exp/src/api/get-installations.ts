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

import { FirebaseApp, getApp, _getProvider } from '@firebase/app-exp';
import { FirebaseInstallations } from '../interfaces/public-types';

/**
 * Returns an instance of FirebaseInstallations associated with the given FirebaseApp instance.
 * @param app - The `FirebaseApp` instance.
 *
 * @public
 */
export function getInstallations(
  app: FirebaseApp = getApp()
): FirebaseInstallations {
  const installationsImpl = _getProvider(
    app,
    'installations-exp'
  ).getImmediate();
  return installationsImpl;
}
