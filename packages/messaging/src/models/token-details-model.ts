/**
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

import { DBInterface } from './db-interface';
import { ERROR_CODES } from './errors';
import { arrayBufferToBase64 } from '../helpers/array-buffer-to-base64';
import { cleanV1 } from './clean-v1-undefined';
import { TokenDetails } from '../interfaces/token-details';

const FCM_TOKEN_OBJ_STORE = 'fcm_token_object_Store';
const DB_NAME = 'fcm_token_details_db';
const DB_VERSION = 2;

export class TokenDetailsModel extends DBInterface {
  constructor() {
    super(DB_NAME, DB_VERSION);
  }

  onDBUpgrade(db: IDBDatabase, evt: IDBVersionChangeEvent) {
    if (evt.oldVersion < 1) {
      // New IDB instance
      var objectStore = db.createObjectStore(FCM_TOKEN_OBJ_STORE, {
        keyPath: 'swScope'
      });

      // Make sure the sender ID can be searched
      objectStore.createIndex('fcmSenderId', 'fcmSenderId', {
        unique: false
      });

      objectStore.createIndex('fcmToken', 'fcmToken', {
        unique: true
      });
    }

    if (evt.oldVersion < 2) {
      // Prior to version 2, we were using either 'fcm_token_details_db'
      // or 'undefined' as the database name due to bug in the SDK
      // So remove the old tokens and databases.
      cleanV1();
    }
  }

  /**
   * This method takes an object and will check for known arguments and
   * validate the input.
   * @return Promise that resolves if input is valid, rejects otherwise.
   */
  private async validateInputs_(input: Partial<TokenDetails>): Promise<void> {
    if (input.fcmToken) {
      if (typeof input.fcmToken !== 'string' || input.fcmToken.length === 0) {
        return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_TOKEN));
      }
    }

    if (input.swScope) {
      if (typeof input.swScope !== 'string' || input.swScope.length === 0) {
        return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_SCOPE));
      }
    }

    if (input.vapidKey) {
      if (
        !(input.vapidKey instanceof Uint8Array) ||
        input.vapidKey.length !== 65
      ) {
        return Promise.reject(
          this.errorFactory_.create(ERROR_CODES.BAD_VAPID_KEY)
        );
      }
    }

    if (input.subscription) {
      if (!(input.subscription instanceof PushSubscription)) {
        return Promise.reject(
          this.errorFactory_.create(ERROR_CODES.BAD_SUBSCRIPTION)
        );
      }
    }

    if (input.fcmSenderId) {
      if (
        typeof input.fcmSenderId !== 'string' ||
        input.fcmSenderId.length === 0
      ) {
        return Promise.reject(
          this.errorFactory_.create(ERROR_CODES.BAD_SENDER_ID)
        );
      }
    }

    if (input.fcmPushSet) {
      if (
        typeof input.fcmPushSet !== 'string' ||
        input.fcmPushSet.length === 0
      ) {
        return Promise.reject(
          this.errorFactory_.create(ERROR_CODES.BAD_PUSH_SET)
        );
      }
    }
  }

  /**
   * Given a token, this method will look up the details in indexedDB.
   * @param {string} fcmToken
   * @return {Promise<TokenDetails>} The details associated with that token.
   */
  getTokenDetailsFromToken(fcmToken: string): Promise<TokenDetails> {
    if (!fcmToken) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_TOKEN));
    }

    return this.validateInputs_({ fcmToken })
      .then(() => this.openDatabase())
      .then(db => {
        return new Promise<TokenDetails>((resolve, reject) => {
          const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const index = objectStore.index('fcmToken');
          const request = index.get(fcmToken);
          request.onerror = function(event) {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = function(event) {
            const result: TokenDetails | null = (<IDBRequest>event.target)
              .result;
            resolve(result!);
          };
        });
      });
  }

  /**
   * Given a service worker scope, this method will look up the details in
   * indexedDB.
   * @return The details associated with that token.
   */
  getTokenDetailsFromSWScope(swScope: string): Promise<TokenDetails> {
    if (!swScope) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_SCOPE));
    }

    return this.validateInputs_({ swScope })
      .then(() => {
        return this.openDatabase();
      })
      .then(db => {
        return new Promise<TokenDetails>((resolve, reject) => {
          const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const scopeRequest = objectStore.get(swScope);
          scopeRequest.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };

          scopeRequest.onsuccess = event => {
            const result: TokenDetails | null = (<IDBRequest>event.target)
              .result;
            resolve(result!);
          };
        });
      });
  }

  /**
   * Save the details for the fcm token for re-use at a later date.
   * @param input A plain js object containing args to save.
   */
  saveTokenDetails({
    swScope,
    vapidKey,
    subscription,
    fcmSenderId,
    fcmToken,
    fcmPushSet
  }: TokenDetails): Promise<void> {
    if (!swScope) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_SCOPE));
    }

    if (!vapidKey) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.BAD_VAPID_KEY)
      );
    }

    if (!subscription) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.BAD_SUBSCRIPTION)
      );
    }

    if (!fcmSenderId) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.BAD_SENDER_ID)
      );
    }

    if (!fcmToken) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_TOKEN));
    }

    if (!fcmPushSet) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.BAD_PUSH_SET)
      );
    }

    return this.validateInputs_({
      swScope,
      vapidKey,
      subscription,
      fcmSenderId,
      fcmToken,
      fcmPushSet
    })
      .then(() => {
        return this.openDatabase();
      })
      .then(db => {
        const details = {
          swScope: swScope,
          vapidKey: arrayBufferToBase64(vapidKey as Uint8Array),
          endpoint: subscription.endpoint,
          auth: arrayBufferToBase64(subscription.getKey('auth')!),
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          fcmSenderId: fcmSenderId,
          fcmToken: fcmToken,
          fcmPushSet: fcmPushSet,
          createTime: Date.now()
        };

        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_TOKEN_OBJ_STORE],
            this.TRANSACTION_READ_WRITE
          );
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const request = objectStore.put(details);
          request.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = event => {
            resolve();
          };
        });
      });
  }

  /**
   * This method deletes details of the current FCM token.
   * It's returning a promise in case we need to move to an async
   * method for deleting at a later date.
   * @return {Promise<Object>} Resolves once the FCM token details have been
   * deleted and returns the deleted details.
   */
  deleteToken(token: string): Promise<TokenDetails> {
    if (typeof token !== 'string' || token.length === 0) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.INVALID_DELETE_TOKEN)
      );
    }

    return this.getTokenDetailsFromToken(token).then(details => {
      if (!details) {
        throw this.errorFactory_.create(ERROR_CODES.DELETE_TOKEN_NOT_FOUND);
      }

      return this.openDatabase().then(db => {
        return new Promise<TokenDetails>((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_TOKEN_OBJ_STORE],
            this.TRANSACTION_READ_WRITE
          );
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const request = objectStore.delete(details.swScope);
          request.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = event => {
            if ((<IDBRequest>event.target).result === 0) {
              reject(
                this.errorFactory_.create(ERROR_CODES.FAILED_TO_DELETE_TOKEN)
              );
              return;
            }

            resolve(details);
          };
        });
      });
    });
  }
}
