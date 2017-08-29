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
import TokenManager from '../src/models/token-manager';

const FCM_TOKEN_DETAILS_DB = 'fcm_token_details_db';
const FCM_TOKEN_OBJ_STORE = 'fcm_token_object_Store';
const FCM_TOKEN_DETAILS_DB_VERSION = 1;

const tokenManager = new TokenManager();

export default {
  closeDatabase: () => {
    return tokenManager.closeDatabase();
  },
  getTokenDetailsFromDB: () => {
    return tokenManager.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const objectStore = db
          .transaction([FCM_TOKEN_OBJ_STORE])
          .objectStore(FCM_TOKEN_OBJ_STORE);

        const allDetails = [];
        const request = objectStore.openCursor();
        request.onerror = event => {
          reject((event.target as any).error);
        };
        request.onsuccess = event => {
          const cursor = (event.target as any).result;
          if (cursor) {
            allDetails.push(cursor.value);
            cursor.continue();
          } else {
            resolve(allDetails);
          }
        };
      });
    });
  },

  addObjectToIndexDB: object => {
    return tokenManager.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE], 'readwrite');
        const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
        const request = objectStore.put(object);
        request.onerror = event => {
          reject((event.target as any).error);
        };
        request.onsuccess = event => {
          resolve();
        };
      });
    });
  },

  updateObjectInIndexDb: object => {
    return tokenManager.openDatabase_().then(db => {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FCM_TOKEN_OBJ_STORE], 'readwrite');
        const objectStore = transaction.objectStore(FCM_TOKEN_OBJ_STORE);
        const request = objectStore.put(object);
        request.onerror = event => {
          reject((event.target as any).error);
        };
        request.onsuccess = event => {
          resolve();
        };
      });
    });
  },

  deleteDB: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(FCM_TOKEN_DETAILS_DB);
      request.onerror = event => {
        reject((event.target as any).error);
      };
      request.onsuccess = event => {
        resolve();
      };
      request.onblocked = event => {
        console.warn('deleteDatabase onblocked.');
      };
    });
  }
};
