# @firebase/messaging-types

## 0.6.1

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

## 0.6.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.5.0

### Minor Changes

- [`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c) [#3234](https://github.com/firebase/firebase-js-sdk/pull/3234) - Add `getToken(options:{serviceWorkerRegistration, vapidKey})`,`onBackgroundMessage`.
  Deprecate `setBackgroundMessageHandler`, `onTokenRefresh`, `useVapidKey`, `useServiceWorker`, `getToken`.

  Add Typing `MessagePayload`, `NotificationPayload`, `FcmOptions`.
