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

/** Web app Firebase config (from Firebase Console). */
export const firebaseConfig = {
  apiKey: 'AIzaSyBpIe0xyUNHOwtE_go32NmUJF4acsc6S6c',
  authDomain: 'fcm-web-sdk-test.firebaseapp.com',
  databaseURL: 'https://fcm-web-sdk-test.firebaseio.com',
  projectId: 'fcm-web-sdk-test',
  storageBucket: 'fcm-web-sdk-test.firebasestorage.app',
  messagingSenderId: '750970317741',
  appId: '1:750970317741:web:f382be3155e250906a4f24',
  measurementId: 'G-JR4QTYFTK4'
} as const;

/** Cloud Messaging Web Push certificate (VAPID public key). */
export const vapidKey =
  'BNjjus3nz38aYtbDLVfunY3VULg0Yq5T4GXWd7iDDmeqWCUNqfrK1eiKVdoT0VncLuCjfJ1GmdfmNZz-AjHfkxM';
