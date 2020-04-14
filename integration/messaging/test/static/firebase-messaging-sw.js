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
importScripts('https://www.gstatic.com/firebasejs/7.10.0/firebase-app.js');
importScripts(
  'https://www.gstatic.com/firebasejs/7.10.0/firebase-messaging.js'
);
importScripts('/firebaseConfig.js');
firebase.initializeApp(FIREBASE_CONFIG);

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(payload => {
  console.log(
    'Received a background message: ' +
      JSON.stringify(payload) +
      '. Routing the message to the test app messages container to be read'
  );

  sendMessageToWindowClients(getClients(), markBackgroundMessage(payload));
});

function getClients() {
  return self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });
}

function sendMessageToWindowClients(clientList, payload) {
  for (const client of clientList) {
    client.postMessage({ ...message, 'isBackgroundMessage': true });
  }
}

function markBackgroundMessage(payload) {
  return { ...payload, 'isBackgroundMessage': true };
}
