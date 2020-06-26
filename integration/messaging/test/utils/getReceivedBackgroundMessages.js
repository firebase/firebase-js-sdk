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

/** Getting received background messages are trickier than getting foreground messages from app. It requires idb object store creation with the service worker. Idb operations are fired as async events. This method needs to be called after the idb operations inside sw is done. In tests, consider adding a brief timeout before calling the method to give sw some time to work.
 */
module.exports = async webdriver => {
  console.log('Getting received background messages from idb: ');

  await webdriver.executeScript(() => {
    window.backgroundMessages = [];

    const dbOpenReq = indexedDB.open(TEST_DB);

    dbOpenReq.onsuccess = () => {
      const db = dbOpenReq.result;
      const tx = db.transaction(BACKGROUND_MESSAGES_OBJECT_STORE, 'readonly');

      tx
        .objectStore(BACKGROUND_MESSAGES_OBJECT_STORE)
        .getAll().onsuccess = e => {
        window.backgroundMessages = e.target.result;
      };
    };
  });

  await webdriver.wait(() => {
    return webdriver.executeScript(() => {
      return window.backgroundMessages.length > 0;
    });
  });

  console.log('Found background messages');
  return webdriver.executeScript(() => {
    return window.backgroundMessages;
  });
};
