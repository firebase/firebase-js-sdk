/**
 * @license
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

importScripts('https://www.gstatic.com/firebasejs/7.14.0/firebase-app.js');
importScripts(
  'https://www.gstatic.com/firebasejs/7.14.0/firebase-messaging.js'
);
importScripts('/firebaseConfig.js');

firebase.initializeApp(FIREBASE_CONFIG);

const messaging = firebase.messaging();

messaging.setBackgroundMessageHandler(data => {
  const title = 'Background Notification';
  return self.registration.showNotification(title, {});
});
