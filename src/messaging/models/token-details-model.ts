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
'use strict';

import DBInterface from './db-interface';
import Errors from './errors';
import arrayBufferToBase64 from '../helpers/array-buffer-to-base64';

const FCM_TOKEN_OBJ_STORE = 'fcm_token_object_Store';
const DB_VERSION = 1;

/** @record */
function ValidateInput() {}
/** @type {string|undefined} */
ValidateInput.prototype.fcmToken;
/** @type {string|undefined} */
ValidateInput.prototype.swScope;
/** @type {string|undefined} */
ValidateInput.prototype.vapidKey;
/** @type {PushSubscription|undefined} */
ValidateInput.prototype.subscription;
/** @type {string|undefined} */
ValidateInput.prototype.fcmSenderId;
/** @type {string|undefined} */
ValidateInput.prototype.fcmPushSet;

export default class TokenDetailsModel extends DBInterface {
  constructor() {
    super(TokenDetailsModel.dbName, DB_VERSION);
  }

  static get dbName() {
    return 'fcm_token_details_db';
  }

  /**
   * @override
   */
  onDBUpgrade(db) {
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

  /**
   * This method takes an object and will check for known arguments and
   * validate the input.
   * @private
   * @param {!ValidateInput} input
   * @return {!Promise} Returns promise that resolves if input is valid,
   * rejects otherwise.
   */
  validateInputs_(input) {
    if (input.fcmToken) {
      if (typeof input.fcmToken !== 'string' || input.fcmToken.length === 0) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_TOKEN)
        );
      }
    }

    if (input.swScope) {
      if (typeof input.swScope !== 'string' || input.swScope.length === 0) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_SCOPE)
        );
      }
    }

    if (input.vapidKey) {
      if (typeof input.vapidKey !== 'string' || input.vapidKey.length === 0) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_VAPID_KEY)
        );
      }
    }

    if (input.subscription) {
      if (!(input.subscription instanceof PushSubscription)) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_SUBSCRIPTION)
        );
      }
    }

    if (input.fcmSenderId) {
      if (
        typeof input.fcmSenderId !== 'string' ||
        input.fcmSenderId.length === 0
      ) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_SENDER_ID)
        );
      }
    }

    if (input.fcmPushSet) {
      if (
        typeof input.fcmPushSet !== 'string' ||
        input.fcmPushSet.length === 0
      ) {
        return Promise.reject(
          this.errorFactory_.create(Errors.codes.BAD_PUSH_SET)
        );
      }
    }

    return Promise.resolve();
  }

  /**
   * Given a token, this method will look up the details in indexedDB.
   * @param {string} fcmToken
   * @return {Promise<Object>} The details associated with that token.
   */
  getTokenDetailsFromToken(fcmToken) {
    if (!fcmToken) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_TOKEN));
    }

    return this.validateInputs_({ fcmToken })
      .then(() => {
        return this.openDatabase();
      })
      .then(db => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const index = objectStore.index('fcmToken');
          const request = index.get(fcmToken);
          request.onerror = function(event) {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = function(event) {
            const result = (<IDBRequest>event.target).result
              ? (<IDBRequest>event.target).result
              : null;
            resolve(result);
          };
        });
      });
  }

  /**
   * Given a service worker scope, this method will look up the details in
   * indexedDB.
   * @public
   * @param {string} swScope
   * @return {Promise<Object>} The details associated with that token.
   */
  getTokenDetailsFromSWScope(swScope) {
    if (!swScope) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_SCOPE));
    }

    return this.validateInputs_({ swScope })
      .then(() => {
        return this.openDatabase();
      })
      .then(db => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const scopeRequest = objectStore.get(swScope);
          scopeRequest.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };

          scopeRequest.onsuccess = event => {
            const result = (<IDBRequest>event.target).result
              ? (<IDBRequest>event.target).result
              : null;
            resolve(result);
          };
        });
      });
  }

  /**
   * Save the details for the fcm token for re-use at a later date.
   * @param {{swScope: !string, vapidKey: !string,
   * subscription: !PushSubscription, fcmSenderId: !string, fcmToken: !string,
   * fcmPushSet: !string}} input A plain js object containing args to save.
   * @return {Promise<void>}
   */
  saveTokenDetails({
    swScope,
    vapidKey,
    subscription,
    fcmSenderId,
    fcmToken,
    fcmPushSet
  }) {
    if (!swScope) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_SCOPE));
    }

    if (!vapidKey) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_VAPID_KEY)
      );
    }

    if (!subscription) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_SUBSCRIPTION)
      );
    }

    if (!fcmSenderId) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_SENDER_ID)
      );
    }

    if (!fcmToken) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_TOKEN));
    }

    if (!fcmPushSet) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_PUSH_SET)
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
        /**
       * @dict
       */
        const details = {
          swScope: swScope,
          vapidKey: vapidKey,
          endpoint: subscription.endpoint,
          auth: arrayBufferToBase64(subscription['getKey']('auth')),
          p256dh: arrayBufferToBase64(subscription['getKey']('p256dh')),
          fcmSenderId: fcmSenderId,
          fcmToken: fcmToken,
          fcmPushSet: fcmPushSet
        };

        return new Promise((resolve, reject) => {
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
   * @param {string} token Token to be deleted
   * @return {Promise<Object>} Resolves once the FCM token details have been
   * deleted and returns the deleted details.
   */
  deleteToken(token) {
    if (typeof token !== 'string' || token.length === 0) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.INVALID_DELETE_TOKEN)
      );
    }

    return this.getTokenDetailsFromToken(token).then(details => {
      if (!details) {
        throw this.errorFactory_.create(Errors.codes.DELETE_TOKEN_NOT_FOUND);
      }

      return this.openDatabase().then(db => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_TOKEN_OBJ_STORE],
            this.TRANSACTION_READ_WRITE
          );
          const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
          const request = objectStore.delete(details['swScope']);
          request.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = event => {
            if ((<IDBRequest>event.target).result === 0) {
              reject(
                this.errorFactory_.create(Errors.codes.FAILED_TO_DELETE_TOKEN)
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
