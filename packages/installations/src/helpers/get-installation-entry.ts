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

import { createInstallationRequest } from '../functions/create-installation-request';
import {
  AppConfig,
  FirebaseInstallationsImpl
} from '../interfaces/installation-impl';
import {
  InProgressInstallationEntry,
  InstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus
} from '../interfaces/installation-entry';
import { PENDING_TIMEOUT_MS } from '../util/constants';
import { ERROR_FACTORY, ErrorCode, isServerError } from '../util/errors';
import { sleep } from '../util/sleep';
import { generateFid, INVALID_FID } from './generate-fid';
import { remove, set, update } from './idb-manager';

export interface InstallationEntryWithRegistrationPromise {
  installationEntry: InstallationEntry;
  /** Exist iff the installationEntry is not registered. */
  registrationPromise?: Promise<RegisteredInstallationEntry>;
}

/**
 * Updates and returns the InstallationEntry from the database.
 * Also triggers a registration request if it is necessary and possible.
 */
export async function getInstallationEntry(
  installations: FirebaseInstallationsImpl
): Promise<InstallationEntryWithRegistrationPromise> {
  let registrationPromise: Promise<RegisteredInstallationEntry> | undefined;

  const installationEntry = await update(installations.appConfig, oldEntry => {
    const installationEntry = updateOrCreateInstallationEntry(oldEntry);
    const entryWithPromise = triggerRegistrationIfNecessary(
      installations,
      installationEntry
    );
    registrationPromise = entryWithPromise.registrationPromise;
    return entryWithPromise.installationEntry;
  });

  if (installationEntry.fid === INVALID_FID) {
    // FID generation failed. Waiting for the FID from the server.
    return { installationEntry: await registrationPromise! };
  }

  return {
    installationEntry,
    registrationPromise
  };
}

/**
 * Creates a new Installation Entry if one does not exist.
 * Also clears timed out pending requests.
 */
function updateOrCreateInstallationEntry(
  oldEntry: InstallationEntry | undefined
): InstallationEntry {
  const entry: InstallationEntry = oldEntry || {
    fid: generateFid(),
    registrationStatus: RequestStatus.NOT_STARTED
  };

  return clearTimedOutRequest(entry);
}

/**
 * If the Firebase Installation is not registered yet, this will trigger the
 * registration and return an InProgressInstallationEntry.
 *
 * If registrationPromise does not exist, the installationEntry is guaranteed
 * to be registered.
 */
function triggerRegistrationIfNecessary(
  installations: FirebaseInstallationsImpl,
  installationEntry: InstallationEntry
): InstallationEntryWithRegistrationPromise {
  if (installationEntry.registrationStatus === RequestStatus.NOT_STARTED) {
    if (!navigator.onLine) {
      // Registration required but app is offline.
      const registrationPromiseWithError = Promise.reject(
        ERROR_FACTORY.create(ErrorCode.APP_OFFLINE)
      );
      return {
        installationEntry,
        registrationPromise: registrationPromiseWithError
      };
    }

    // Try registering. Change status to IN_PROGRESS.
    const inProgressEntry: InProgressInstallationEntry = {
      fid: installationEntry.fid,
      registrationStatus: RequestStatus.IN_PROGRESS,
      registrationTime: Date.now()
    };
    const registrationPromise = registerInstallation(
      installations,
      inProgressEntry
    );
    return { installationEntry: inProgressEntry, registrationPromise };
  } else if (
    installationEntry.registrationStatus === RequestStatus.IN_PROGRESS
  ) {
    return {
      installationEntry,
      registrationPromise: waitUntilFidRegistration(installations)
    };
  } else {
    return { installationEntry };
  }
}

/** This will be executed only once for each new Firebase Installation. */
async function registerInstallation(
  installations: FirebaseInstallationsImpl,
  installationEntry: InProgressInstallationEntry
): Promise<RegisteredInstallationEntry> {
  try {
    const registeredInstallationEntry = await createInstallationRequest(
      installations,
      installationEntry
    );
    return set(installations.appConfig, registeredInstallationEntry);
  } catch (e) {
    if (isServerError(e) && e.customData.serverCode === 409) {
      // Server returned a "FID can not be used" error.
      // Generate a new ID next time.
      await remove(installations.appConfig);
    } else {
      // Registration failed. Set FID as not registered.
      await set(installations.appConfig, {
        fid: installationEntry.fid,
        registrationStatus: RequestStatus.NOT_STARTED
      });
    }
    throw e;
  }
}

/** Call if FID registration is pending in another request. */
async function waitUntilFidRegistration(
  installations: FirebaseInstallationsImpl
): Promise<RegisteredInstallationEntry> {
  // Unfortunately, there is no way of reliably observing when a value in
  // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
  // so we need to poll.

  let entry: InstallationEntry = await updateInstallationRequest(
    installations.appConfig
  );
  while (entry.registrationStatus === RequestStatus.IN_PROGRESS) {
    // createInstallation request still in progress.
    await sleep(100);

    entry = await updateInstallationRequest(installations.appConfig);
  }

  if (entry.registrationStatus === RequestStatus.NOT_STARTED) {
    // The request timed out or failed in a different call. Try again.
    const { installationEntry, registrationPromise } =
      await getInstallationEntry(installations);

    if (registrationPromise) {
      return registrationPromise;
    } else {
      // if there is no registrationPromise, entry is registered.
      return installationEntry as RegisteredInstallationEntry;
    }
  }

  return entry;
}

/**
 * Called only if there is a CreateInstallation request in progress.
 *
 * Updates the InstallationEntry in the DB based on the status of the
 * CreateInstallation request.
 *
 * Returns the updated InstallationEntry.
 */
function updateInstallationRequest(
  appConfig: AppConfig
): Promise<InstallationEntry> {
  return update(appConfig, oldEntry => {
    if (!oldEntry) {
      throw ERROR_FACTORY.create(ErrorCode.INSTALLATION_NOT_FOUND);
    }
    return clearTimedOutRequest(oldEntry);
  });
}

function clearTimedOutRequest(entry: InstallationEntry): InstallationEntry {
  if (hasInstallationRequestTimedOut(entry)) {
    return {
      fid: entry.fid,
      registrationStatus: RequestStatus.NOT_STARTED
    };
  }

  return entry;
}

function hasInstallationRequestTimedOut(
  installationEntry: InstallationEntry
): boolean {
  return (
    installationEntry.registrationStatus === RequestStatus.IN_PROGRESS &&
    installationEntry.registrationTime + PENDING_TIMEOUT_MS < Date.now()
  );
}
