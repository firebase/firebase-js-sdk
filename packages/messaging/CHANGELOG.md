# @firebase/messaging

## 0.7.5

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e)]:
  - @firebase/util@0.4.0
  - @firebase/component@0.2.1
  - @firebase/installations@0.4.21

## 0.7.4

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0
  - @firebase/installations@0.4.20

## 0.7.3

### Patch Changes

- [`54a46f89c`](https://github.com/firebase/firebase-js-sdk/commit/54a46f89c1c45435c76412fa2ed296e986c2f6ab) [#3780](https://github.com/firebase/firebase-js-sdk/pull/3780) - Adds a timeout for `onBackgroundMessage` hook so that silent-push warnings won't show if `showNotification` is called inside the hook within 1s.
  This fixes the issue where the silent-push warning is displayed along with the message shown with [ServiceWorkerRegistration.showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification).
- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21
  - @firebase/installations@0.4.19

## 0.7.2

### Patch Changes

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce)]:
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3
  - @firebase/installations@0.4.18

## 0.7.1

### Patch Changes

- [`dc9892565`](https://github.com/firebase/firebase-js-sdk/commit/dc989256566b8379f475c722370ccbd8f47527c3) [#3710](https://github.com/firebase/firebase-js-sdk/pull/3710) - stops redirecting user to non-origin urls.

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2
  - @firebase/installations@0.4.17

## 0.7.0

### Minor Changes

- [`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c) [#3234](https://github.com/firebase/firebase-js-sdk/pull/3234) - Add `getToken(options:{serviceWorkerRegistration, vapidKey})`,`onBackgroundMessage`.
  Deprecate `setBackgroundMessageHandler`, `onTokenRefresh`, `useVapidKey`, `useServiceWorker`, `getToken`.

  Add Typing `MessagePayload`, `NotificationPayload`, `FcmOptions`.

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089), [`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c)]:
  - @firebase/util@0.3.1
  - @firebase/messaging-types@0.5.0
  - @firebase/component@0.1.18
  - @firebase/installations@0.4.16

## 0.6.21

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17
  - @firebase/installations@0.4.15

## 0.6.20

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

* [`17c628eb`](https://github.com/firebase/firebase-js-sdk/commit/17c628eb228c21ad1d4db83fdae08d1142a2b902) [#3312](https://github.com/firebase/firebase-js-sdk/pull/3312) Thanks [@Feiyang1](https://github.com/Feiyang1)! - Fixed an issue where we try to update token for every getToken() call because we don't save the updated token in the IndexedDB.

- [`469c8bdf`](https://github.com/firebase/firebase-js-sdk/commit/469c8bdf18c4a22e99d595a9896af2f934df20fd) [#3221](https://github.com/firebase/firebase-js-sdk/pull/3221) Thanks [@zwu52](https://github.com/zwu52)! - Added support for `onMessage` so the internal callback can work with [Subscriber](https://rxjs.dev/api/index/class/Subscriber)

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:

  - @firebase/component@0.1.16
  - @firebase/installations@0.4.14

## 0.6.11

- [fixed] Fixed an issue introduced in firebase@7.7.0, when FCM switched to provide base64-encoded VAPID
  key to [PushManager](https://developer.mozilla.org/en-US/docs/Web/API/PushManager) for push subscription. For backward compatibility, the SDK has switched back to using VAPID key in type [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer).
