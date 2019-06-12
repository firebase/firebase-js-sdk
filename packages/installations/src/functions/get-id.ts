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
import { RequestStatus } from '../interfaces/installation-entry';

export async function getId(app: FirebaseApp): Promise<string> {
  const appConfig = extractAppConfig(app);
  const { installationEntry, registrationPromise } = await getInstallationEntry(
    appConfig
  );

  if (registrationPromise) {
    // Suppress registration errors as they are not a problem for getId.
    registrationPromise.catch(() => {});
  }

  if (installationEntry.registrationStatus === RequestStatus.COMPLETED) {
    // If the installation is already registered, update the authentication
    // token if needed. Suppress errors as they are not relevant to getId.
    refreshAuthToken(appConfig).catch(() => {});
  }

  return installationEntry.fid;
}
