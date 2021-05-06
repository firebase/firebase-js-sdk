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

import { uuidv4 } from './util';
import { FirebaseApp } from '@firebase/app-exp';
import { isIndexedDBAvailable } from '@firebase/util';
import {
  readDebugTokenFromIndexedDB,
  readTokenFromIndexedDB,
  writeDebugTokenToIndexedDB,
  writeTokenToIndexedDB
} from './indexeddb';
import { logger } from './logger';
import { AppCheckTokenInternal } from './state';

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
      logger.warn(`Failed to read token from indexeddb. Error: ${e}`);
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
  token: AppCheckTokenInternal
): Promise<void> {
  if (isIndexedDBAvailable()) {
    return writeTokenToIndexedDB(app, token).catch(e => {
      // swallow the error and resolve the promise
      logger.warn(`Failed to write token to indexeddb. Error: ${e}`);
    });
  }

  return Promise.resolve();
}

export async function readOrCreateDebugTokenFromStorage(): Promise<string> {
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
    const newToken = uuidv4();
    // We don't need to block on writing to indexeddb
    // In case persistence failed, a new debug token will be generated everytime the page is refreshed.
    // It renders the debug token useless because you have to manually register(whitelist) the new token in the firebase console again and again.
    // If you see this error trying to use debug token, it probably means you are using a browser that doesn't support indexeddb.
    // You should switch to a different browser that supports indexeddb
    writeDebugTokenToIndexedDB(newToken).catch(e =>
      logger.warn(`Failed to persist debug token to indexeddb. Error: ${e}`)
    );
    // Not using logger because I don't think we ever want this accidentally hidden?
    console.log(
      `AppCheck debug token: ${newToken}. You will need to whitelist it in the Firebase console for it to work`
    );
    return newToken;
  } else {
    return existingDebugToken;
  }
}
