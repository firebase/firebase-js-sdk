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
  apiKey: 'AIzaSyAsPuMXP3A2GQlMYe6dzYbsmn4C5mTbhu0',
  authDomain: 'fcm-js-sdk-test.firebaseapp.com',
  projectId: 'fcm-js-sdk-test',
  storageBucket: 'fcm-js-sdk-test.firebasestorage.app',
  messagingSenderId: '4222659428',
  appId: '1:4222659428:web:55a4c1c4cd7871fb83a871',
  measurementId: 'G-4SWZLJXREP'
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, payload => {
  console.log('[firebase-messaging-sw.js] background message', payload);
});
