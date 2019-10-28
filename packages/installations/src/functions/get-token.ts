/**
 * @license
 * Copyright 2019 Google Inc.
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

import { FirebaseApp } from '@firebase/app-types';
import { extractAppConfig } from '../helpers/extract-app-config';
import { getInstallationEntry } from '../helpers/get-installation-entry';
import { refreshAuthToken } from '../helpers/refresh-auth-token';
import { AppConfig } from '../interfaces/app-config';

export async function getToken(
  app: FirebaseApp,
  forceRefresh = false
): Promise<string> {
  const appConfig = extractAppConfig(app);

  await completeInstallationRegistration(appConfig);

  // At this point we either have a Registered Installation in the DB, or we've
  // already thrown an error.
  const authToken = await refreshAuthToken(appConfig, forceRefresh);
  return authToken.token;
}

async function completeInstallationRegistration(
  appConfig: AppConfig
): Promise<void> {
  const { registrationPromise } = await getInstallationEntry(appConfig);

  if (registrationPromise) {
    // A createInstallation request is in progress. Wait until it finishes.
    await registrationPromise;
  }
}
