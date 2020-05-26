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

const TEST_DB = 'FCM_INTEGRATION_TEST_DB';
const BACKGROUND_MESSAGES_OBJECT_STORE = 'background_messages';

module.exports = async webdriver => {
  console.log('Requesting to clear background messages store...');

  await webdriver.executeScript(() => {
    window.isStoreCleared = false;

    const dbOpenReq = indexedDB.open(TEST_DB);

    dbOpenReq.onsuccess = () => {
      const db = dbOpenReq.result;
      const tx = db.transaction(BACKGROUND_MESSAGES_OBJECT_STORE, 'readwrite');

      const clearStoreReq = tx
        .objectStore(BACKGROUND_MESSAGES_OBJECT_STORE)
        .clear();

      clearStoreReq.onsuccess = () => {
        console.log('Successfully cleared object store');
        window.isStoreCleared = true;
      };
    };
  });

  await webdriver.wait(() => {
    return webdriver.executeScript(() => {
      return window.isStoreCleared;
    });
  });
};
