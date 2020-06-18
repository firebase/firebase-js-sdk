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

async function addPayloadToDb(payload) {
  const dbOpenReq = indexedDB.open(TEST_DB);

  dbOpenReq.onupgradeneeded = () => {
    const db = dbOpenReq.result;

    // store creation is a synchronized call
    console.log('creating object store...');
    db.createObjectStore(BACKGROUND_MESSAGES_OBJECT_STORE, {
      keyPath: BACKGROUND_MESSAGES_OBJECT_STORE_PRIMARY_KEY
    });
  };

  dbOpenReq.onsuccess = () => {
    const db = dbOpenReq.result;

    addPayloadToDbInternal(db, {
      ...payload,
      // ndx is required as the primary key of the store. It doesn't have any other testing purpose
      ndx: BACKGROUND_MESSAGES_OBJECT_STORE_DEFAULT_NDX
    });
  };
}

async function addPayloadToDbInternal(db, payload) {
  // onsuccess might race with onupgradeneeded. Consequently causing "object stores was not found" error. Therefore, wait briefly for db.createObjectStore to complete
  const delay = ms => new Promise(res => setTimeout(res, ms));
  await delay(/* milliseconds= */ 30000);

  tx = db.transaction(BACKGROUND_MESSAGES_OBJECT_STORE, 'readwrite');

  console.log('adding message payload to db: ' + JSON.stringify(payload));
  addReq = tx.objectStore(BACKGROUND_MESSAGES_OBJECT_STORE).add(payload);
}
