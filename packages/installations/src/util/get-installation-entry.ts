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

import { FirebaseError } from '@firebase/util';
import { createInstallation } from '../api';
import { SERVICE } from '../constants';
import { ErrorCode } from '../errors';
import { remove, set, update } from '../idb-manager';
import { AppConfig } from '../interfaces/app-config';
import {
  InProgressInstallationEntry,
  InstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { generateFid } from './generate-fid';
import { hasInstallationRequestTimedOut } from './request-time-out-checks';

export interface InstallationEntryWithRegistrationPromise {
  installationEntry: InstallationEntry;
  registrationPromise?: Promise<void>;
}
/**
 * Updates and returns the InstallationEntry from the database.
 * Also triggers a registration request if it is necessary and possible.
 */
export async function getInstallationEntry(
  appConfig: AppConfig
): Promise<InstallationEntryWithRegistrationPromise> {
  let registrationPromise: Promise<void> | undefined;

  return {
    installationEntry: await update(
      appConfig.appId,
      (oldEntry?: InstallationEntry): InstallationEntry => {
        const installationEntry = updateOrCreateFid(oldEntry);
        const entryWithPromise = triggerRegistrationIfNecessary(
          appConfig,
          installationEntry
        );
        registrationPromise = entryWithPromise.registrationPromise;
        return entryWithPromise.installationEntry;
      }
    ),
    registrationPromise
  };
}

function updateOrCreateFid(
  oldEntry: InstallationEntry | undefined
): InstallationEntry {
  const entry: InstallationEntry = oldEntry || {
    fid: generateFid(),
    registrationStatus: RequestStatus.NOT_STARTED
  };

  if (hasInstallationRequestTimedOut(entry)) {
    return {
      fid: entry.fid,
      registrationStatus: RequestStatus.NOT_STARTED
    };
  }

  return entry;
}

/**
 * If the Firebase Installation is not registered yet and the app is online,
 * this will trigger the registration and return an InProgressInstallationEntry.
 */
function triggerRegistrationIfNecessary(
  appConfig: AppConfig,
  installationEntry: InstallationEntry
): InstallationEntryWithRegistrationPromise {
  if (
    installationEntry.registrationStatus === RequestStatus.NOT_STARTED &&
    navigator.onLine
  ) {
    // Try registering. Change status to IN_PROGRESS.
    const inProgressEntry: InProgressInstallationEntry = {
      fid: installationEntry.fid,
      registrationStatus: RequestStatus.IN_PROGRESS,
      registrationTime: Date.now()
    };
    const registrationPromise = registerInstallation(
      appConfig,
      inProgressEntry
    );
    return { installationEntry: inProgressEntry, registrationPromise };
  } else {
    return { installationEntry };
  }
}

/** This will be executed only once for each new Firebase Installation. */
async function registerInstallation(
  appConfig: AppConfig,
  installationEntry: InProgressInstallationEntry
): Promise<void> {
  try {
    const registeredInstallationEntry = await createInstallation(
      appConfig,
      installationEntry
    );
    await set(appConfig.appId, registeredInstallationEntry);
  } catch (e) {
    if (
      e instanceof FirebaseError &&
      e.code === `${SERVICE}/${ErrorCode.CREATE_INSTALLATION_REQUEST_FAILED}` &&
      // FirebaseError doesn't have the best typings.
      // tslint:disable-next-line:no-any
      (e as any).serverCode === 409
    ) {
      // Server returned a "FID can not be used" error.
      // Generate a new ID next time.
      await remove(appConfig.appId);
    } else {
      await set(appConfig.appId, {
        fid: installationEntry.fid,
        registrationStatus: RequestStatus.NOT_STARTED
      });
    }
    throw e;
  }
}
