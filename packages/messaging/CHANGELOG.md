# @firebase/messaging

## 0.9.13

### Patch Changes

- [`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801) [#6154](https://github.com/firebase/firebase-js-sdk/pull/6154) - Replace stopgap firebase/util IndexedDB methods with `idb` library.

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/installations@0.5.9
  - @firebase/component@0.5.14

## 0.9.12

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13
  - @firebase/installations@0.5.8

## 0.9.11

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12
  - @firebase/installations@0.5.7

## 0.9.10

### Patch Changes

- [`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03) [#6061](https://github.com/firebase/firebase-js-sdk/pull/6061) - Remove idb dependency and replace with our own code.

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03), [`ddeff8384`](https://github.com/firebase/firebase-js-sdk/commit/ddeff8384ab8a927f02244e2591db525fd58c7dd)]:
  - @firebase/installations@0.5.6
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.9.9

### Patch Changes

- [`b3e4af842`](https://github.com/firebase/firebase-js-sdk/commit/b3e4af842786af7371430fa5b04a814435faa791) [#6030](https://github.com/firebase/firebase-js-sdk/pull/6030) - Await on `onBackgroundMessage` to fix silent warning issue.

## 0.9.8

### Patch Changes

- [`0a04a1c06`](https://github.com/firebase/firebase-js-sdk/commit/0a04a1c0657d74657b88aa5e67608b815cb3c03d) [#5957](https://github.com/firebase/firebase-js-sdk/pull/5957) (fixes [#5868](https://github.com/firebase/firebase-js-sdk/issues/5868)) - Fix uncaught rejection in `isSupported()` if environment does not support IndexedDB's `open()` method.

## 0.9.7

### Patch Changes

- [`93e6126b3`](https://github.com/firebase/firebase-js-sdk/commit/93e6126b3dfde795423109f5aaaf0a010cb142b6) [#5901](https://github.com/firebase/firebase-js-sdk/pull/5901) - Changed messaging `exports` paths to always point to cjs bundles when in a Node.js context.

## 0.9.6

### Patch Changes

- [`88d43ec00`](https://github.com/firebase/firebase-js-sdk/commit/88d43ec0027ff857923ab41255b3650e666fa29e) [#5884](https://github.com/firebase/firebase-js-sdk/pull/5884) - Add a CJS bundle for messaging/sw. This enables some SSR frameworks to run their Node.js pipelines without erroring.

* [`3c20727d8`](https://github.com/firebase/firebase-js-sdk/commit/3c20727d83f2d68edc108e8112b06d3232a7d310) [#5881](https://github.com/firebase/firebase-js-sdk/pull/5881) - Fix message id parsing.

## 0.9.5

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10
  - @firebase/installations@0.5.5

## 0.9.4

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/installations@0.5.4
  - @firebase/util@1.4.2

## 0.9.3

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/installations@0.5.3
  - @firebase/util@1.4.1

## 0.9.2

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

- Updated dependencies [[`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f)]:
  - @firebase/installations@0.5.2

## 0.9.1

### Patch Changes

- [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422) [#5506](https://github.com/firebase/firebase-js-sdk/pull/5506) - checking isSupported led to runtime errors in certain environments

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7
  - @firebase/installations@0.5.1

## 0.9.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - @firebase/installations@0.5.0
  - @firebase/messaging-interop-types@0.1.0

## 0.8.0

### Minor Changes

- [`d0710d500`](https://github.com/firebase/firebase-js-sdk/commit/d0710d5006a07318213163127051eebf0c339383) [#5139](https://github.com/firebase/firebase-js-sdk/pull/5139) - Allows retrieval of `messageId` from `MessagePayload`.

### Patch Changes

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/util@1.3.0
  - @firebase/installations@0.4.32

## 0.7.15

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5
  - @firebase/installations@0.4.31

## 0.7.14

### Patch Changes

- Updated dependencies [[`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/component@0.5.4
  - @firebase/installations@0.4.30

## 0.7.13

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3
  - @firebase/installations@0.4.29

## 0.7.12

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2
  - @firebase/installations@0.4.28

## 0.7.11

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1
  - @firebase/installations@0.4.27

## 0.7.10

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/util@1.1.0
  - @firebase/installations@0.4.26

## 0.7.9

### Patch Changes

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda)]:
  - @firebase/util@1.0.0
  - @firebase/component@0.4.1
  - @firebase/installations@0.4.25

## 0.7.8

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0
  - @firebase/installations@0.4.24

## 0.7.7

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - @firebase/component@0.3.1
  - @firebase/installations@0.4.23

## 0.7.6

### Patch Changes

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0
  - @firebase/installations@0.4.22

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
