### Initial Setup

To begin monitoring your application, install the core Firebase App package and the preview Crashlytics module:

```bash
npm install @firebase/app@eap-crashlytics @firebase/crashlytics@eap-crashlytics
```

#### Initialize Firebase App

Create a central configuration utility file (`src/lib/firebase.ts`) using the credentials found in the Firebase Console under **Settings > General**. Both manual trackers and framework interfaces leverage this initialized `FirebaseApp` instance.

```typescript
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from '@firebase/app';

const firebaseConfig = {
  apiKey: "<YOUR_FIREBASE_API_KEY>",
  authDomain: "<YOUR_AUTH_DOMAIN>",
  projectId: "<YOUR_FIREBASE_PROJECT_ID>",
  storageBucket: "<YOUR_STORAGE_BUCKET>",
  messagingSenderId: "<YOUR_MESSAGING_SENDER_ID>",
  appId: "<YOUR_FIREBASE_APP_ID>"
};

// Guarantee singleton initialization
export const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();
```
