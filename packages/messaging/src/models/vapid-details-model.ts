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

import { DBInterface } from './db-interface';
import { ERROR_CODES } from './errors';

const FCM_VAPID_OBJ_STORE = 'fcm_vapid_object_Store';
const DB_NAME = 'fcm_vapid_details_db';
const DB_VERSION = 1;
const UNCOMPRESSED_PUBLIC_KEY_SIZE = 65;

export class VapidDetailsModel extends DBInterface {
  constructor() {
    super(DB_NAME, DB_VERSION);
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
   */
  getVapidFromSWScope(swScope: string): Promise<Uint8Array> {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_SCOPE));
    }

    return this.openDatabase().then(db => {
      return new Promise<Uint8Array>((resolve, reject) => {
        const transaction = db.transaction([FCM_VAPID_OBJ_STORE]);
        const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
        const scopeRequest = objectStore.get(swScope);
        scopeRequest.onerror = () => {
          reject(scopeRequest.error);
        };

        scopeRequest.onsuccess = () => {
          let result = scopeRequest.result;
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
   */
  saveVapidDetails(swScope: string, vapidKey: Uint8Array): Promise<void> {
    if (typeof swScope !== 'string' || swScope.length === 0) {
      return Promise.reject(this.errorFactory_.create(ERROR_CODES.BAD_SCOPE));
    }

    if (vapidKey === null || vapidKey.length !== UNCOMPRESSED_PUBLIC_KEY_SIZE) {
      return Promise.reject(
        this.errorFactory_.create(ERROR_CODES.BAD_VAPID_KEY)
      );
    }

    const details = {
      swScope: swScope,
      vapidKey: vapidKey
    };

    return this.openDatabase().then(db => {
      return new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          [FCM_VAPID_OBJ_STORE],
          this.TRANSACTION_READ_WRITE
        );
        const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
        const request = objectStore.put(details);
        request.onerror = () => {
          reject(request.error);
        };
        request.onsuccess = () => {
          resolve();
        };
      });
    });
  }

  /**
   * This method deletes details of the current FCM VAPID key for a SW scope.
   * Resolves once the scope/vapid details have been deleted and returns the
   * deleted vapid key.
   */
  deleteVapidDetails(swScope: string): Promise<Uint8Array> {
    return this.getVapidFromSWScope(swScope).then(vapidKey => {
      if (!vapidKey) {
        throw this.errorFactory_.create(ERROR_CODES.DELETE_SCOPE_NOT_FOUND);
      }

      return this.openDatabase().then(db => {
        return new Promise<Uint8Array>((resolve, reject) => {
          const transaction = db.transaction(
            [FCM_VAPID_OBJ_STORE],
            this.TRANSACTION_READ_WRITE
          );
          const objectStore = transaction.objectStore(FCM_VAPID_OBJ_STORE);
          const request = objectStore.delete(swScope);
          request.onerror = () => {
            reject(request.error);
          };
          request.onsuccess = () => {
            if (request.result === 0) {
              reject(
                this.errorFactory_.create(ERROR_CODES.FAILED_DELETE_VAPID_KEY)
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
