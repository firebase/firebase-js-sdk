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

import { ErrorFactory } from '@firebase/util';

import Errors from './errors';
import arrayBufferToBase64 from '../helpers/array-buffer-to-base64';
import FCMDetails from './fcm-details';

const FCM_TOKEN_DETAILS_DB = 'fcm_token_details_db';
const FCM_TOKEN_OBJ_STORE = 'fcm_token_object_Store';
const FCM_TOKEN_DETAILS_DB_VERSION = 1;

export default class TokenManager {
  private errorFactory_: ErrorFactory<string>;
  private openDbPromise_: Promise<IDBDatabase>;

  constructor() {
    this.errorFactory_ = new ErrorFactory('messaging', 'Messaging', Errors.map);
    this.openDbPromise_ = null;
  }

  /**
   * Get the indexedDB as a promsie.
   * @private
   * @return {Promise<IDBDatabase>} The IndexedDB database
   */
  openDatabase_() {
    if (this.openDbPromise_) {
      return this.openDbPromise_;
    }

    this.openDbPromise_ = new Promise((resolve, reject) => {
      const request = indexedDB.open(
        FCM_TOKEN_DETAILS_DB,
        FCM_TOKEN_DETAILS_DB_VERSION
      );
      request.onerror = event => {
        reject((<IDBRequest>event.target).error);
      };
      request.onsuccess = event => {
        resolve((<IDBRequest>event.target).result);
      };
      request.onupgradeneeded = event => {
        var db = (<IDBRequest>event.target).result;

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
      };
    });

    return this.openDbPromise_;
  }

  /**
   * Close the currently open database.
   * @return {Promise<?>} Returns the result of the promise chain.
   */
  closeDatabase() {
    if (this.openDbPromise_) {
      return this.openDbPromise_.then(db => {
        db.close();
        this.openDbPromise_ = null;
      });
    }

    return Promise.resolve();
  }

  /**
   * Given a token, this method will look up the details in indexedDB.
   * @public
   * @param {string} fcmToken
   * @return {Promise<Object>} The details associated with that token.
   */
  getTokenDetailsFromToken(fcmToken) {
    return this.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
        const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
        const index = objectStore.index('fcmToken');
        const request = index.get(fcmToken);
        request.onerror = function(event) {
          reject((<IDBRequest>event.target).error);
        };
        request.onsuccess = function(event) {
          resolve((<IDBRequest>event.target).result);
        };
      });
    });
  }

  getTokenDetailsFromSWScope_(swScope) {
    return this.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
        const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
        const scopeRequest = objectStore.get(swScope);
        scopeRequest.onerror = event => {
          reject((<IDBRequest>event.target).error);
        };

        scopeRequest.onsuccess = event => {
          resolve((<IDBRequest>event.target).result);
        };
      });
    });
  }

  getAllTokenDetailsForSenderId_(senderId): Promise<Array<Object>> {
    return this.openDatabase_().then(db => {
      return new Promise<Array<Object>>((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE]);
        const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);

        const senderIdTokens = [];

        const cursorRequest = objectStore.openCursor();
        cursorRequest.onerror = event => {
          reject((<IDBRequest>event.target).error);
        };

        cursorRequest.onsuccess = event => {
          const cursor = (<IDBRequest>event.target).result;
          if (cursor) {
            if (cursor.value['fcmSenderId'] === senderId) {
              senderIdTokens.push(cursor.value);
            }
            cursor.continue();
          } else {
            resolve(senderIdTokens);
          }
        };
      });
    });
  }

  /**
   * Given a PushSubscription and messagingSenderId, get an FCM token.
   * @public
   * @param  {string} senderId The 'messagingSenderId' to tie the token to.
   * @param  {PushSubscription} subscription The PushSusbcription to "federate".
   * @param  {string=} pushSet If defined this will swap the subscription for
   * matching FCM token.
   * @return {Promise<!Object>} Returns the FCM token to be used in place
   * of the PushSubscription.
   */
  subscribeToFCM(senderId, subscription, pushSet?): Promise<Object> {
    const p256dh = arrayBufferToBase64(subscription['getKey']('p256dh'));
    const auth = arrayBufferToBase64(subscription['getKey']('auth'));

    let fcmSubscribeBody =
      `authorized_entity=${senderId}&` +
      `endpoint=${subscription.endpoint}&` +
      `encryption_key=${p256dh}&` +
      `encryption_auth=${auth}`;

    if (pushSet) {
      fcmSubscribeBody += `&pushSet=${pushSet}`;
    }

    const headers = new Headers();
    headers.append('Content-Type', 'application/x-www-form-urlencoded');

    const subscribeOptions = {
      method: 'POST',
      headers: headers,
      body: fcmSubscribeBody
    };

    return fetch(
      FCMDetails.ENDPOINT + '/fcm/connect/subscribe',
      subscribeOptions
    )
      .then(response => response.json())
      .then(response => {
        const fcmTokenResponse = response;
        if (fcmTokenResponse['error']) {
          const message = fcmTokenResponse['error']['message'];
          throw this.errorFactory_.create(Errors.codes.TOKEN_SUBSCRIBE_FAILED, {
            message: message
          });
        }

        if (!fcmTokenResponse['token']) {
          throw this.errorFactory_.create(
            Errors.codes.TOKEN_SUBSCRIBE_NO_TOKEN
          );
        }

        if (!fcmTokenResponse['pushSet']) {
          throw this.errorFactory_.create(
            Errors.codes.TOKEN_SUBSCRIBE_NO_PUSH_SET
          );
        }

        return {
          token: fcmTokenResponse['token'],
          pushSet: fcmTokenResponse['pushSet']
        };
      });
  }

  /**
   * Checks the that fields in the PushSubscription are equivalent to the
   * details stores in the masterTokenDetails.
   * @private
   * @param  {PushSubscription} subscription The push subscription we expect
   * the master token to match.
   * @param  {Object}  masterTokenDetails The saved details we wish to compare
   * with the PushSubscription
   * @return {boolean} true if the subscription and token details are
   * equivalent.
   */
  isSameSubscription_(subscription, masterTokenDetails) {
    // getKey() isn't defined in the PushSubscription externs file, hence
    // subscription['getKey']('<key name>').
    return (
      subscription.endpoint === masterTokenDetails['endpoint'] &&
      arrayBufferToBase64(subscription['getKey']('auth')) ===
        masterTokenDetails['auth'] &&
      arrayBufferToBase64(subscription['getKey']('p256dh')) ===
        masterTokenDetails['p256dh']
    );
  }

  /**
   * Save the details for the fcm token for re-use at a later date.
   * @private
   * @param  {string} senderId The 'messagingSenderId' used for this project
   * @param  {ServiceWorkerRegistration} swRegistration The service worker
   * used to subscribe the user for web push
   * @param  {PushSubscription} subscription The push subscription passed to
   * FCM for the current token.
   * @param  {string} fcmToken The FCM token currently used on this
   * device.
   * @param  {string} fcmPushSet The FCM push tied to the fcm token.
   * @return {Promise<void>}
   */
  saveTokenDetails_(
    senderId,
    swRegistration,
    subscription,
    fcmToken,
    fcmPushSet
  ) {
    const details = {
      swScope: swRegistration.scope,
      endpoint: subscription.endpoint,
      auth: arrayBufferToBase64(subscription['getKey']('auth')),
      p256dh: arrayBufferToBase64(subscription['getKey']('p256dh')),
      fcmToken: fcmToken,
      fcmPushSet: fcmPushSet,
      fcmSenderId: senderId
    };

    return this.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE], 'readwrite');
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
   * Returns the saved FCM Token if one is available and still valid,
   * otherwise `null` is returned.
   * @param {string} senderId This should be the sender ID associated with the
   * FCM Token being retrieved.
   * @param {ServiceWorkerRegistration} swRegistration Registration to be used
   * to subscribe the user to push.
   * @return {Promise<string> | Promise} Returns the saved FCM Token if
   * avilable and valid.
   * @export
   */
  getSavedToken(senderId, swRegistration) {
    if (!(swRegistration instanceof ServiceWorkerRegistration)) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.SW_REGISTRATION_EXPECTED)
      );
    }

    if (typeof senderId !== 'string' || senderId.length === 0) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_SENDER_ID)
      );
    }

    return this.getAllTokenDetailsForSenderId_(senderId)
      .then(allTokenDetails => {
        if (allTokenDetails.length === 0) {
          return;
        }

        const index = allTokenDetails.findIndex(tokenDetails => {
          return (
            swRegistration.scope === tokenDetails['swScope'] &&
            senderId === tokenDetails['fcmSenderId']
          );
        });

        if (index === -1) {
          return;
        }

        return allTokenDetails[index];
      })
      .then(tokenDetails => {
        if (!tokenDetails) {
          return;
        }

        return swRegistration.pushManager
          .getSubscription()
          .catch(err => {
            throw this.errorFactory_.create(
              Errors.codes.GET_SUBSCRIPTION_FAILED
            );
          })
          .then(subscription => {
            if (
              subscription &&
              this.isSameSubscription_(subscription, tokenDetails)
            ) {
              return tokenDetails['fcmToken'];
            }
          });
      });
  }

  /**
   * Creates a new FCM token.
   */
  createToken(senderId, swRegistration): Promise<String> {
    if (typeof senderId !== 'string' || senderId.length === 0) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_SENDER_ID)
      );
    }

    if (!(swRegistration instanceof ServiceWorkerRegistration)) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.SW_REGISTRATION_EXPECTED)
      );
    }

    // Check for existing subscription first
    let subscription;
    let fcmTokenDetails;
    return swRegistration.pushManager
      .getSubscription()
      .then(subscription => {
        if (subscription) {
          return subscription;
        }

        return swRegistration.pushManager.subscribe(
          FCMDetails.SUBSCRIPTION_OPTIONS
        );
      })
      .then(sub => {
        subscription = sub;
        return this.subscribeToFCM(senderId, subscription);
      })
      .then(tokenDetails => {
        fcmTokenDetails = tokenDetails;
        return this.saveTokenDetails_(
          senderId,
          swRegistration,
          subscription,
          fcmTokenDetails['token'],
          fcmTokenDetails['pushSet']
        );
      })
      .then(() => fcmTokenDetails['token']);
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

      return this.openDatabase_().then(db => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_TOKEN_OBJ_STORE],
            'readwrite'
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
