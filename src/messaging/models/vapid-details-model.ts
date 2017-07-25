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

const FCM_VAPID_OBJ_STORE = 'fcm_vapid_object_Store';
const DB_VERSION = 1;

export default class VapidDetailsModel extends DBInterface {
  constructor() {
    super(VapidDetailsModel.dbName, DB_VERSION);
  }

  static get dbName() {
    return 'fcm_vapid_details_db';
  }

  /**
   * @override
   * @param {IDBDatabase} db
   */
  onDBUpgrade(db) {
    db.createObjectStore(FCM_VAPID_OBJ_STORE, {
      keyPath: 'swScope'
    });
  }

  /**
   * Given a service worker scope, this method will look up the vapid key
   * in indexedDB.
   * @param {string} swScope
   * @return {Promise<string>} The vapid key associated with that scope.
   */
  getVapidFromSWScope(swScope) {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_SCOPE));
    }

    return this.openDatabase().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_VAPID_OBJ_STORE]);
        const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
        const scopeRequest = objectStore.get(swScope);
        scopeRequest.onerror = event => {
          reject((<IDBRequest>event.target).error);
        };

        scopeRequest.onsuccess = event => {
          let result = (<IDBRequest>event.target).result;
          let vapidKey = null;
          if (result) {
            vapidKey = result.vapidKey;
          }
          resolve(vapidKey);
        };
      });
    });
  }

  /**
   * Save a vapid key against a swScope for later date.
   * @param  {string} swScope The service worker scope to be associated with
   * this push subscription.
   * @param {string} vapidKey The public vapid key to be associated with
   * the swScope.
   * @return {Promise<void>}
   */
  saveVapidDetails(swScope, vapidKey) {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      return Promise.reject(this.errorFactory_.create(Errors.codes.BAD_SCOPE));
    }

    if (typeof vapidKey !== 'string' || vapidKey.length === 0) {
      return Promise.reject(
        this.errorFactory_.create(Errors.codes.BAD_VAPID_KEY)
      );
    }

    const details = {
      swScope: swScope,
      vapidKey: vapidKey
    };

    return this.openDatabase().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(
          [FCM_VAPID_OBJ_STORE],
          this.TRANSACTION_READ_WRITE
        );
        const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
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
   * This method deletes details of the current FCM VAPID key for a SW scope.
   * @param {string} swScope Scope to be deleted
   * @return {Promise<string>} Resolves once the scope / vapid details have been
   * deleted and returns the deleted vapid key.
   */
  deleteVapidDetails(swScope) {
    return this.getVapidFromSWScope(swScope).then(vapidKey => {
      if (!vapidKey) {
        throw this.errorFactory_.create(Errors.codes.DELETE_SCOPE_NOT_FOUND);
      }

      return this.openDatabase().then(db => {
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_VAPID_OBJ_STORE],
            this.TRANSACTION_READ_WRITE
          );
          const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
          const request = objectStore.delete(swScope);
          request.onerror = event => {
            reject((<IDBRequest>event.target).error);
          };
          request.onsuccess = event => {
            if ((<IDBRequest>event.target).result === 0) {
              reject(
                this.errorFactory_.create(Errors.codes.FAILED_DELETE_VAPID_KEY)
              );
              return;
            }

            resolve(vapidKey);
          };
        });
      });
    });
  }
}
