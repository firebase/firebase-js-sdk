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
import { FirebaseError } from '@firebase/util';
import { generateAuthToken } from './api';
import { SERVICE, TOKEN_EXPIRATION_BUFFER } from './constants';
import { ERROR_FACTORY, ErrorCode } from './errors';
import { remove, set, update } from './idb-manager';
import { AppConfig } from './interfaces/app-config';
import {
  AuthToken,
  CompletedAuthToken,
  InProgressAuthToken,
  InstallationEntry,
  RegisteredInstallationEntry,
  RequestStatus
} from './interfaces/installation-entry';
import { extractAppConfig } from './util/extract-app-config';
import { getInstallationEntry } from './util/get-installation-entry';
import {
  hasAuthTokenRequestTimedOut,
  hasInstallationRequestTimedOut
} from './util/request-time-out-checks';
import { sleep } from './util/sleep';

export async function getAuthToken(app: FirebaseApp): Promise<string> {
  const appConfig = extractAppConfig(app);

  const { installationEntry, registrationPromise } = await getInstallationEntry(
    appConfig
  );
  if (registrationPromise) {
    // A new createInstallation request was created. Wait until it finishes.
    await registrationPromise;
  } else if (
    installationEntry.registrationStatus === RequestStatus.IN_PROGRESS
  ) {
    // There is an active createInstallation request. Wait until it finishes.
    await waitUntilFidRegistration(appConfig.appId);
  } else if (
    installationEntry.registrationStatus === RequestStatus.NOT_STARTED
  ) {
    // Installation ID can't be registered.
    throw ERROR_FACTORY.create(ErrorCode.CREATE_INSTALLATION_FAILED);
  }

  // At this point we either have a Registered Installation in the DB, or we've
  // already thrown an error.
  return fetchAuthToken(appConfig);
}

async function fetchAuthToken(appConfig: AppConfig): Promise<string> {
  let tokenPromise: Promise<CompletedAuthToken> | undefined;
  const entry = await update(
    appConfig.appId,
    (oldEntry?: InstallationEntry): RegisteredInstallationEntry => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY.create(ErrorCode.NOT_REGISTERED);
      }

      const oldAuthToken = oldEntry.authToken;
      if (isAuthTokenValid(oldAuthToken)) {
        // There is a valid token in the DB.
        return oldEntry;
      } else if (oldAuthToken.requestStatus === RequestStatus.IN_PROGRESS) {
        // There already is a token request in progress.
        tokenPromise = waitUntilAuthTokenRequest(appConfig.appId);
        return oldEntry;
      } else {
        // No token or token expired.
        if (!navigator.onLine) {
          throw ERROR_FACTORY.create(ErrorCode.APP_OFFLINE);
        }

        const inProgressEntry = makeAuthTokenRequestInProgressEntry(oldEntry);
        tokenPromise = fetchAuthTokenFromServer(appConfig, inProgressEntry);
        return inProgressEntry;
      }
    }
  );

  const authToken: CompletedAuthToken = tokenPromise
    ? await tokenPromise
    : (entry.authToken as CompletedAuthToken);
  return authToken.token;
}

/**
 * Call only if FID is registered and Auth Token request is in progress.
 */
async function waitUntilAuthTokenRequest(
  appId: string
): Promise<CompletedAuthToken> {
  // Unfortunately, there is no way of reliably observing when a value in
  // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
  // so we need to poll.

  let entry = await updateAuthTokenRequest(appId);
  while (entry.authToken.requestStatus === RequestStatus.IN_PROGRESS) {
    // generateAuthToken still in progress.
    await sleep(100);

    entry = await updateAuthTokenRequest(appId);
  }

  const authToken = entry.authToken;
  if (authToken.requestStatus === RequestStatus.NOT_STARTED) {
    throw ERROR_FACTORY.create(ErrorCode.GENERATE_TOKEN_FAILED);
  } else {
    return authToken;
  }
}

/**
 * Called only if there is a GenerateAuthToken request in progress.
 *
 * Updates the InstallationEntry in the DB based on the status of the
 * GenerateAuthToken request.
 *
 * Returns the updated InstallationEntry.
 */
function updateAuthTokenRequest(
  appId: string
): Promise<RegisteredInstallationEntry> {
  return update(
    appId,
    (oldEntry?: InstallationEntry): RegisteredInstallationEntry => {
      if (!isEntryRegistered(oldEntry)) {
        throw ERROR_FACTORY.create(ErrorCode.NOT_REGISTERED);
      }

      const oldAuthToken = oldEntry.authToken;
      if (hasAuthTokenRequestTimedOut(oldAuthToken)) {
        return {
          ...oldEntry,
          authToken: { requestStatus: RequestStatus.NOT_STARTED }
        };
      }

      return oldEntry;
    }
  );
}

/** Call if FID registration is pending. */
async function waitUntilFidRegistration(
  appId: string
): Promise<RegisteredInstallationEntry> {
  // Unfortunately, there is no way of reliably observing when a value in
  // IndexedDB changes (yet, see https://github.com/WICG/indexed-db-observers),
  // so we need to poll.

  let entry: InstallationEntry = await updateInstallationRequest(appId);
  while (entry.registrationStatus === RequestStatus.IN_PROGRESS) {
    // createInstallation request still in progress.
    await sleep(100);

    entry = await updateInstallationRequest(appId);
  }

  if (entry.registrationStatus === RequestStatus.NOT_STARTED) {
    throw ERROR_FACTORY.create(ErrorCode.CREATE_INSTALLATION_FAILED);
  } else {
    return entry;
  }
}

/**
 * Called only if there is a CreateInstallation request in progress.
 *
 * Updates the InstallationEntry in the DB based on the status of the
 * CreateInstallation request.
 *
 * Returns the updated InstallationEntry.
 */
function updateInstallationRequest(appId: string): Promise<InstallationEntry> {
  return update(
    appId,
    (oldEntry?: InstallationEntry): InstallationEntry => {
      if (!oldEntry) {
        throw ERROR_FACTORY.create(ErrorCode.INSTALLATION_NOT_FOUND);
      }

      if (hasInstallationRequestTimedOut(oldEntry)) {
        return {
          fid: oldEntry.fid,
          registrationStatus: RequestStatus.NOT_STARTED
        };
      }

      return oldEntry;
    }
  );
}

async function fetchAuthTokenFromServer(
  appConfig: AppConfig,
  installationEntry: RegisteredInstallationEntry
): Promise<CompletedAuthToken> {
  try {
    const authToken = await generateAuthToken(appConfig, installationEntry);
    const updatedInstallationEntry: RegisteredInstallationEntry = {
      ...installationEntry,
      authToken
    };
    await set(appConfig.appId, updatedInstallationEntry);
    return authToken;
  } catch (e) {
    if (
      e instanceof FirebaseError &&
      e.code === `${SERVICE}/${ErrorCode.GENERATE_TOKEN_REQUEST_FAILED}` &&
      // FirebaseError doesn't have the best typings.
      // tslint:disable-next-line:no-any
      ((e as any).serverCode === 401 || (e as any).serverCode === 404)
    ) {
      // Server returned a "FID not found" or a "Invalid authentication" error.
      // Generate a new ID next time.
      await remove(appConfig.appId);
    } else {
      const updatedInstallationEntry: RegisteredInstallationEntry = {
        ...installationEntry,
        authToken: { requestStatus: RequestStatus.NOT_STARTED }
      };
      await set(appConfig.appId, updatedInstallationEntry);
    }
    throw e;
  }
}

function isEntryRegistered(
  installationEntry: InstallationEntry | undefined
): installationEntry is RegisteredInstallationEntry {
  return (
    installationEntry !== undefined &&
    installationEntry.registrationStatus === RequestStatus.COMPLETED
  );
}

function isAuthTokenValid(authToken: AuthToken): boolean {
  return (
    authToken.requestStatus === RequestStatus.COMPLETED &&
    !isAuthTokenExpired(authToken)
  );
}

function isAuthTokenExpired(authToken: CompletedAuthToken): boolean {
  const now = Date.now();
  return (
    now < authToken.creationTime ||
    authToken.creationTime + authToken.expiresIn < now + TOKEN_EXPIRATION_BUFFER
  );
}

/** Returns an updated InstallationEntry with an InProgressAuthToken. */
function makeAuthTokenRequestInProgressEntry(
  oldEntry: RegisteredInstallationEntry
): RegisteredInstallationEntry {
  const inProgressAuthToken: InProgressAuthToken = {
    requestStatus: RequestStatus.IN_PROGRESS,
    requestTime: Date.now()
  };
  return {
    ...oldEntry,
    authToken: inProgressAuthToken
  };
}
