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
  apiKey: 'AIzaSyAsPuMXP3A2GQlMYe6dzYbsmn4C5mTbhu0',
  authDomain: 'fcm-js-sdk-test.firebaseapp.com',
  projectId: 'fcm-js-sdk-test',
  storageBucket: 'fcm-js-sdk-test.firebasestorage.app',
  messagingSenderId: '4222659428',
  appId: '1:4222659428:web:55a4c1c4cd7871fb83a871',
  measurementId: 'G-4SWZLJXREP'
} as const;

/**
 * Cloud Messaging Web Push certificate (VAPID public key).
 * Override with `VITE_VAPID_KEY` in `.env.local` if needed.
 */
export const vapidKey: string =
  import.meta.env.VITE_VAPID_KEY ??
  'BNgD0_baqe_huO6dVr5gei5Qe3sR5GmCN2CcK2u2sAspoTUas9vOlwZKUZw6_LDIWZ3OOu8jmVT0iBFK7_5v96M';
