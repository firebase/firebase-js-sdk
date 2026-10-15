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

import { FirebaseApp } from '@firebase/app';
import { isIndexedDBAvailable } from '@firebase/util';
import {
  readDebugTokenFromIndexedDB,
  readTokenFromIndexedDB,
  writeDebugTokenToIndexedDB,
  writeTokenToIndexedDB
} from './indexeddb';
import { logger } from './logger';
import { AppCheckTokenInternal } from './types';

/**
 * Always resolves. In case of an error reading from indexeddb, resolve with undefined
 */
export async function readTokenFromStorage(
  app: FirebaseApp
): Promise<AppCheckTokenInternal | undefined> {
  if (isIndexedDBAvailable()) {
    let token = undefined;
    try {
      token = await readTokenFromIndexedDB(app);
    } catch (e) {
      // swallow the error and return undefined
      logger.warn(`Failed to read token from IndexedDB. Error: ${e}`);
    }
    return token;
  }

  return undefined;
}

/**
 * Always resolves. In case of an error writing to indexeddb, print a warning and resolve the promise
 */
export function writeTokenToStorage(
  app: FirebaseApp,
  token?: AppCheckTokenInternal
): Promise<void> {
  if (isIndexedDBAvailable()) {
    return writeTokenToIndexedDB(app, token).catch(e => {
      // swallow the error and resolve the promise
      logger.warn(`Failed to write token to IndexedDB. Error: ${e}`);
    });
  }

  return Promise.resolve();
}

export async function readOrCreateDebugTokenFromStorage(
  app?: FirebaseApp
): Promise<string> {
  /**
   * Theoretically race condition can happen if we read, then write in 2 separate transactions.
   * But it won't happen here, because this function will be called exactly once.
   */
  let existingDebugToken: string | undefined = undefined;
  try {
    existingDebugToken = await readDebugTokenFromIndexedDB();
  } catch (_e) {
    // failed to read from indexeddb. We assume there is no existing debug token, and generate a new one.
  }

  if (!existingDebugToken) {
    // create a new debug token
    // This function is only available in secure contexts. See https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts
    const newToken = crypto.randomUUID();

    let message =
      `To use this token for app debugging, register it with your project.\n\n` +
      `Firebase App Check debug token: ${newToken}\n\n`;

    const appId = app?.options.appId;
    const projectId = app?.options.projectId;
    if (projectId && appId) {
      message +=
        `You can do so in the Firebase Console:\n` +
        `https://console.firebase.google.com/project/${projectId}/appcheck/apps?selectedAppId=${appId}\n\n` +
        `Or using the Firebase CLI:\n` +
        `firebase appcheck:debugtokens:create ${newToken} --project ${projectId} --app ${appId}\n\n`;
    } else {
      message += `You will need to add it to your app's App Check settings in the Firebase Console for it to work.\n\n`;
    }

    message +=
      `Note: To keep your project secure, please revoke and delete this token using the\n` +
      `Firebase Console or the CLI (\`firebase appcheck:debugtokens:delete\`) when you finish debugging.\n\n` +
      `Warning: This debug token is a secret and should not be shared or uploaded to source code.\n\n` +
      `Debug Token Guide: https://firebase.google.com/docs/app-check/web/debug-provider\n` +
      `Firebase CLI install instructions: https://firebase.google.com/docs/cli\n`;

    console.log(message);

    // We don't need to block on writing to indexeddb
    // In case persistence failed, a new debug token will be generated every time the page is refreshed.
    // It renders the debug token useless because you have to manually register(whitelist) the new token in the firebase console again and again.
    // If you see this error trying to use debug token, it probably means you are using a browser that doesn't support indexeddb.
    // You should switch to a different browser that supports indexeddb
    writeDebugTokenToIndexedDB(newToken).catch(e =>
      logger.warn(`Failed to persist debug token to IndexedDB. Error: ${e}`)
    );
    return newToken;
  } else {
    return existingDebugToken;
  }
}
