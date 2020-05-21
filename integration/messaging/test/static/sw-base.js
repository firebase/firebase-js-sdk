/**
 * @license
 * Copyright 2017 Google LLC
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

importScripts('../constants.js');

// HEAD targets served through express middleware
importScripts('/firebase-app.js');
importScripts('/firebase-messaging.js');

firebase.initializeApp(FIREBASE_CONFIG);
const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(payload => {
  console.log(
    TAG +
      'a background message is received: ' +
      JSON.stringify(payload) +
      '. Storing it into idb for tests to read...'
  );

  addPayloadToDb(payload);
});

function addPayloadToDb(payload) {
  const request = indexedDB.open(TEST_DB);

  request.onupgradeneeded = e => {
    let db = e.target.result;
    console.log('creating object store...');
    db.createObjectStore(BACKGROUND_MESSAGES_OBJECT_STORE, {
      keyPath: BACKGROUND_MESSAGES_OBJECT_STORE_PRIMARY_KEY
    });
  };

  request.onsuccess = e => {
    let db = e.target.result;

    addPayloadToDbInternal(db, {
      ...payload,
      // ndx is required as the primary key of the store
      ndx: BACKGROUND_MESSAGES_OBJECT_STORE_DEFAULT_NDX
    });
  };
}

function addPayloadToDbInternal(db, payload) {
  let isStoreCreated = false;

  tx = db.transaction(BACKGROUND_MESSAGES_OBJECT_STORE, 'readwrite');

  console.log('adding message payload to db: ' + JSON.stringify(payload));
  addReq = tx.objectStore(BACKGROUND_MESSAGES_OBJECT_STORE).add(payload);

  addReq.onsuccess = () => {
    isStoreCreated = true;
  };
}
