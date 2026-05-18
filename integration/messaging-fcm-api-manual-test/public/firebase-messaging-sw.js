/**
 * @license
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 */

/**
 * Service worker for FCM background messages.
 * Uses the official CDN build (same major line as workspace `firebase`) so scope `/` works
 * with Vite dev server and static hosting. Main app still uses the monorepo `firebase` package.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  getMessaging,
  onBackgroundMessage
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-sw.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBpIe0xyUNHOwtE_go32NmUJF4acsc6S6c',
  authDomain: 'fcm-web-sdk-test.firebaseapp.com',
  databaseURL: 'https://fcm-web-sdk-test.firebaseio.com',
  projectId: 'fcm-web-sdk-test',
  storageBucket: 'fcm-web-sdk-test.firebasestorage.app',
  messagingSenderId: '750970317741',
  appId: '1:750970317741:web:f382be3155e250906a4f24',
  measurementId: 'G-JR4QTYFTK4'
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, payload => {
  console.log('[firebase-messaging-sw.js] background message', payload);
});
