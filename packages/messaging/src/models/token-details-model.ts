/**
 * @license
 * Copyright 2017 Google Inc.
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

import { base64ToArrayBuffer } from '../helpers/base64-to-array-buffer';
import { TokenDetails } from '../interfaces/token-details';
import { cleanV1 } from './clean-v1-undefined';
import { DbInterface } from './db-interface';
import { ErrorCode, errorFactory } from './errors';

export class TokenDetailsModel extends DbInterface {
  protected readonly dbName: string = 'fcm_token_details_db';
  protected readonly dbVersion: number = 3;
  protected readonly objectStoreName: string = 'fcm_token_object_Store';

  protected onDbUpgrade(
    request: IDBOpenDBRequest,
    event: IDBVersionChangeEvent
  ): void {
    const db: IDBDatabase = request.result;

    // Lack of 'break' statements is intentional.
    switch (event.oldVersion) {
      case 0: {
        // New IDB instance
        const objectStore = db.createObjectStore(this.objectStoreName, {
          keyPath: 'swScope'
        });

        // Make sure the sender ID can be searched
        objectStore.createIndex('fcmSenderId', 'fcmSenderId', {
          unique: false
        });

        objectStore.createIndex('fcmToken', 'fcmToken', { unique: true });
      }

      case 1: {
        // Prior to version 2, we were using either 'fcm_token_details_db'
        // or 'undefined' as the database name due to bug in the SDK
        // So remove the old tokens and databases.
        cleanV1();
      }

      case 2: {
        const objectStore = request.transaction!.objectStore(
          this.objectStoreName
        );
        const cursorRequest = objectStore.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor: IDBCursorWithValue | null = cursorRequest.result;
          if (cursor) {
            const value = cursor.value;
            const newValue: Partial<TokenDetails> = { ...value };

            if (!value.createTime) {
              newValue.createTime = Date.now();
            }

            if (typeof value.vapidKey === 'string') {
              newValue.vapidKey = base64ToArrayBuffer(value.vapidKey);
            }

            if (typeof value.auth === 'string') {
              newValue.auth = base64ToArrayBuffer(value.auth).buffer;
            }

            if (typeof value.auth === 'string') {
              newValue.p256dh = base64ToArrayBuffer(value.p256dh).buffer;
            }

            cursor.update(newValue);
            cursor.continue();
          }
        };
      }
    }
  }

  /**
   * Given a token, this method will look up the details in indexedDB.
   */
  async getTokenDetailsFromToken(
    fcmToken: string
  ): Promise<TokenDetails | undefined> {
    if (!fcmToken) {
      throw errorFactory.create(ErrorCode.BAD_TOKEN);
    }

    validateInputs({ fcmToken });

    return this.getIndex<TokenDetails>('fcmToken', fcmToken);
  }

  /**
   * Given a service worker scope, this method will look up the details in
   * indexedDB.
   * @return The details associated with that token.
   */
  async getTokenDetailsFromSWScope(
    swScope: string
  ): Promise<TokenDetails | undefined> {
    if (!swScope) {
      throw errorFactory.create(ErrorCode.BAD_SCOPE);
    }

    validateInputs({ swScope });

    return this.get<TokenDetails>(swScope);
  }

  /**
   * Save the details for the fcm token for re-use at a later date.
   * @param input A plain js object containing args to save.
   */
  async saveTokenDetails(tokenDetails: TokenDetails): Promise<void> {
    if (!tokenDetails.swScope) {
      throw errorFactory.create(ErrorCode.BAD_SCOPE);
    }

    if (!tokenDetails.vapidKey) {
      throw errorFactory.create(ErrorCode.BAD_VAPID_KEY);
    }

    if (!tokenDetails.endpoint || !tokenDetails.auth || !tokenDetails.p256dh) {
      throw errorFactory.create(ErrorCode.BAD_SUBSCRIPTION);
    }

    if (!tokenDetails.fcmSenderId) {
      throw errorFactory.create(ErrorCode.BAD_SENDER_ID);
    }

    if (!tokenDetails.fcmToken) {
      throw errorFactory.create(ErrorCode.BAD_TOKEN);
    }

    if (!tokenDetails.fcmPushSet) {
      throw errorFactory.create(ErrorCode.BAD_PUSH_SET);
    }

    validateInputs(tokenDetails);

    return this.put(tokenDetails);
  }

  /**
   * This method deletes details of the current FCM token.
   * It's returning a promise in case we need to move to an async
   * method for deleting at a later date.
   *
   * @return Resolves once the FCM token details have been deleted and returns
   * the deleted details.
   */
  async deleteToken(token: string): Promise<TokenDetails> {
    if (typeof token !== 'string' || token.length === 0) {
      return Promise.reject(
        errorFactory.create(ErrorCode.INVALID_DELETE_TOKEN)
      );
    }

    const details = await this.getTokenDetailsFromToken(token);
    if (!details) {
      throw errorFactory.create(ErrorCode.DELETE_TOKEN_NOT_FOUND);
    }

    await this.delete(details.swScope);
    return details;
  }
}

/**
 * This method takes an object and will check for known arguments and
 * validate the input.
 * @return Promise that resolves if input is valid, rejects otherwise.
 */
function validateInputs(input: Partial<TokenDetails>): void {
  if (input.fcmToken) {
    if (typeof input.fcmToken !== 'string' || input.fcmToken.length === 0) {
      throw errorFactory.create(ErrorCode.BAD_TOKEN);
    }
  }

  if (input.swScope) {
    if (typeof input.swScope !== 'string' || input.swScope.length === 0) {
      throw errorFactory.create(ErrorCode.BAD_SCOPE);
    }
  }

  if (input.vapidKey) {
    if (
      !(input.vapidKey instanceof Uint8Array) ||
      input.vapidKey.length !== 65
    ) {
      throw errorFactory.create(ErrorCode.BAD_VAPID_KEY);
    }
  }

  if (input.endpoint) {
    if (typeof input.endpoint !== 'string' || input.endpoint.length === 0) {
      throw errorFactory.create(ErrorCode.BAD_SUBSCRIPTION);
    }
  }

  if (input.auth) {
    if (!(input.auth instanceof ArrayBuffer)) {
      throw errorFactory.create(ErrorCode.BAD_SUBSCRIPTION);
    }
  }

  if (input.p256dh) {
    if (!(input.p256dh instanceof ArrayBuffer)) {
      throw errorFactory.create(ErrorCode.BAD_SUBSCRIPTION);
    }
  }

  if (input.fcmSenderId) {
    if (
      typeof input.fcmSenderId !== 'string' ||
      input.fcmSenderId.length === 0
    ) {
      throw errorFactory.create(ErrorCode.BAD_SENDER_ID);
    }
  }

  if (input.fcmPushSet) {
    if (typeof input.fcmPushSet !== 'string' || input.fcmPushSet.length === 0) {
      throw errorFactory.create(ErrorCode.BAD_PUSH_SET);
    }
  }
}
