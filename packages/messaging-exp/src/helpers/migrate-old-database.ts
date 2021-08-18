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

import { deleteDb, openDb } from 'idb';

import { TokenDetails } from '../interfaces/token-details';
import { arrayToBase64 } from './array-base64-translator';

// https://github.com/firebase/firebase-js-sdk/blob/7857c212f944a2a9eb421fd4cb7370181bc034b5/packages/messaging/src/interfaces/token-details.ts
export interface V2TokenDetails {
  fcmToken: string;
  swScope: string;
  vapidKey: string | Uint8Array;
  subscription: PushSubscription;
  fcmSenderId: string;
  fcmPushSet: string;
  createTime?: number;
  endpoint?: string;
  auth?: string;
  p256dh?: string;
}

// https://github.com/firebase/firebase-js-sdk/blob/6b5b15ce4ea3df5df5df8a8b33a4e41e249c7715/packages/messaging/src/interfaces/token-details.ts
export interface V3TokenDetails {
  fcmToken: string;
  swScope: string;
  vapidKey: Uint8Array;
  fcmSenderId: string;
  fcmPushSet: string;
  endpoint: string;
  auth: ArrayBuffer;
  p256dh: ArrayBuffer;
  createTime: number;
}

// https://github.com/firebase/firebase-js-sdk/blob/9567dba664732f681fa7fe60f5b7032bb1daf4c9/packages/messaging/src/interfaces/token-details.ts
export interface V4TokenDetails {
  fcmToken: string;
  swScope: string;
  vapidKey: Uint8Array;
  fcmSenderId: string;
  endpoint: string;
  auth: ArrayBufferLike;
  p256dh: ArrayBufferLike;
  createTime: number;
}

const OLD_DB_NAME = 'fcm_token_details_db';
/**
 * The last DB version of 'fcm_token_details_db' was 4. This is one higher, so that the upgrade
 * callback is called for all versions of the old DB.
 */
const OLD_DB_VERSION = 5;
const OLD_OBJECT_STORE_NAME = 'fcm_token_object_Store';

export async function migrateOldDatabase(
  senderId: string
): Promise<TokenDetails | null> {
  if ('databases' in indexedDB) {
    // indexedDb.databases() is an IndexedDB v3 API and does not exist in all browsers. TODO: Remove
    // typecast when it lands in TS types.
    const databases = await (indexedDB as {
      databases(): Promise<Array<{ name: string; version: number }>>;
    }).databases();
    const dbNames = databases.map(db => db.name);

    if (!dbNames.includes(OLD_DB_NAME)) {
      // old DB didn't exist, no need to open.
      return null;
    }
  }

  let tokenDetails: TokenDetails | null = null;

  const db = await openDb(OLD_DB_NAME, OLD_DB_VERSION, async db => {
    if (db.oldVersion < 2) {
      // Database too old, skip migration.
      return;
    }

    if (!db.objectStoreNames.contains(OLD_OBJECT_STORE_NAME)) {
      // Database did not exist. Nothing to do.
      return;
    }

    const objectStore = db.transaction.objectStore(OLD_OBJECT_STORE_NAME);
    const value = await objectStore.index('fcmSenderId').get(senderId);
    await objectStore.clear();

    if (!value) {
      // No entry in the database, nothing to migrate.
      return;
    }

    if (db.oldVersion === 2) {
      const oldDetails = value as V2TokenDetails;

      if (!oldDetails.auth || !oldDetails.p256dh || !oldDetails.endpoint) {
        return;
      }

      tokenDetails = {
        token: oldDetails.fcmToken,
        createTime: oldDetails.createTime ?? Date.now(),
        subscriptionOptions: {
          auth: oldDetails.auth,
          p256dh: oldDetails.p256dh,
          endpoint: oldDetails.endpoint,
          swScope: oldDetails.swScope,
          vapidKey:
            typeof oldDetails.vapidKey === 'string'
              ? oldDetails.vapidKey
              : arrayToBase64(oldDetails.vapidKey)
        }
      };
    } else if (db.oldVersion === 3) {
      const oldDetails = value as V3TokenDetails;

      tokenDetails = {
        token: oldDetails.fcmToken,
        createTime: oldDetails.createTime,
        subscriptionOptions: {
          auth: arrayToBase64(oldDetails.auth),
          p256dh: arrayToBase64(oldDetails.p256dh),
          endpoint: oldDetails.endpoint,
          swScope: oldDetails.swScope,
          vapidKey: arrayToBase64(oldDetails.vapidKey)
        }
      };
    } else if (db.oldVersion === 4) {
      const oldDetails = value as V4TokenDetails;

      tokenDetails = {
        token: oldDetails.fcmToken,
        createTime: oldDetails.createTime,
        subscriptionOptions: {
          auth: arrayToBase64(oldDetails.auth),
          p256dh: arrayToBase64(oldDetails.p256dh),
          endpoint: oldDetails.endpoint,
          swScope: oldDetails.swScope,
          vapidKey: arrayToBase64(oldDetails.vapidKey)
        }
      };
    }
  });
  db.close();

  // Delete all old databases.
  await deleteDb(OLD_DB_NAME);
  await deleteDb('fcm_vapid_details_db');
  await deleteDb('undefined');

  return checkTokenDetails(tokenDetails) ? tokenDetails : null;
}

function checkTokenDetails(
  tokenDetails: TokenDetails | null
): tokenDetails is TokenDetails {
  if (!tokenDetails || !tokenDetails.subscriptionOptions) {
    return false;
  }
  const { subscriptionOptions } = tokenDetails;
  return (
    typeof tokenDetails.createTime === 'number' &&
    tokenDetails.createTime > 0 &&
    typeof tokenDetails.token === 'string' &&
    tokenDetails.token.length > 0 &&
    typeof subscriptionOptions.auth === 'string' &&
    subscriptionOptions.auth.length > 0 &&
    typeof subscriptionOptions.p256dh === 'string' &&
    subscriptionOptions.p256dh.length > 0 &&
    typeof subscriptionOptions.endpoint === 'string' &&
    subscriptionOptions.endpoint.length > 0 &&
    typeof subscriptionOptions.swScope === 'string' &&
    subscriptionOptions.swScope.length > 0 &&
    typeof subscriptionOptions.vapidKey === 'string' &&
    subscriptionOptions.vapidKey.length > 0
  );
}
