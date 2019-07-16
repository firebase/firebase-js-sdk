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
import { deleteInstallation as deleteInstallationRequest } from '../api/delete-installation';
import { extractAppConfig } from '../helpers/extract-app-config';
import { remove, update } from '../helpers/idb-manager';
import {
  InProgressInstallationEntry,
  InstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { ERROR_FACTORY, ErrorCode } from '../util/errors';

export async function deleteInstallation(app: FirebaseApp): Promise<void> {
  const appConfig = extractAppConfig(app);

  const entry = await update(appConfig, (oldEntry?: InstallationEntry):
    | InProgressInstallationEntry
    | RegisteredInstallationEntry
    | undefined => {
    if (oldEntry && oldEntry.registrationStatus === RequestStatus.NOT_STARTED) {
      // Delete the unregistered entry without sending a deleteInstallation request.
      return undefined;
    }
    return oldEntry;
  });

  if (entry) {
    if (entry.registrationStatus === RequestStatus.IN_PROGRESS) {
      // Can't delete while trying to register.
      throw ERROR_FACTORY.create(ErrorCode.DELETE_PENDING_REGISTRATION);
    } else if (entry.registrationStatus === RequestStatus.COMPLETED) {
      if (!navigator.onLine) {
        throw ERROR_FACTORY.create(ErrorCode.APP_OFFLINE);
      } else {
        await deleteInstallationRequest(appConfig, entry);
        await remove(appConfig);
      }
    }
  }
}
