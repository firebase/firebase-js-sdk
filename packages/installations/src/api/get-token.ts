/**
 * @license
 * Copyright 2019 Google LLC
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

import { getInstallationEntry } from '../helpers/get-installation-entry';
import { refreshAuthToken } from '../helpers/refresh-auth-token';
import { FirebaseInstallationsImpl } from '../interfaces/installation-impl';
import { Installations } from '../interfaces/public-types';

/**
 * Returns a Firebase Installations auth token, identifying the current
 * Firebase Installation.
 * @param installations - The `Installations` instance.
 * @param forceRefresh - Force refresh regardless of token expiration.
 *
 * @public
 */
export async function getToken(
  installations: Installations,
  forceRefresh = false
): Promise<string> {
  const installationsImpl = installations as FirebaseInstallationsImpl;
  await completeInstallationRegistration(installationsImpl);

  // At this point we either have a Registered Installation in the DB, or we've
  // already thrown an error.
  const authToken = await refreshAuthToken(installationsImpl, forceRefresh);
  return authToken.token;
}

async function completeInstallationRegistration(
  installations: FirebaseInstallationsImpl
): Promise<void> {
  const { registrationPromise } = await getInstallationEntry(installations);

  if (registrationPromise) {
    // A createInstallation request is in progress. Wait until it finishes.
    await registrationPromise;
  }
}
