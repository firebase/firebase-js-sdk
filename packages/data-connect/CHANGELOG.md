## Unreleased

## 0.3.11

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 0.3.10

### Patch Changes

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 0.3.9

### Patch Changes

- [`b5df4ae`](https://github.com/firebase/firebase-js-sdk/commit/b5df4ae71c1b5b54d9237e7929d0f793189b82c9) [#9055](https://github.com/firebase/firebase-js-sdk/pull/9055) - Updated to only show banner when calling connect\*Emulator

## 0.3.8

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 0.3.7

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 0.3.6

### Patch Changes

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 0.3.5

### Patch Changes

- [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb) [#8968](https://github.com/firebase/firebase-js-sdk/pull/8968) - Fix Auth Redirects on Firebase Studio

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 0.3.4

### Patch Changes

- [`1df3d26`](https://github.com/firebase/firebase-js-sdk/commit/1df3d26fbfb4db24b74d5d779825017e9ec40eaa) [#8898](https://github.com/firebase/firebase-js-sdk/pull/8898) - Fix DataConnectOperationError.

## 0.3.3

### Patch Changes

- [`edb4001`](https://github.com/firebase/firebase-js-sdk/commit/edb40010bb480806b26f48601b65f4257ffed2df) [#8821](https://github.com/firebase/firebase-js-sdk/pull/8821) - Expose partial errors to the user.

## 0.3.2

### Patch Changes

- [`43d6b67`](https://github.com/firebase/firebase-js-sdk/commit/43d6b6735f8b1d20dbe33793b57adb221efde95d) [#8820](https://github.com/firebase/firebase-js-sdk/pull/8820) - Update requests to point to v1 backend endpoints instead of v1beta

## 0.3.1

### Patch Changes

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 0.3.0

### Minor Changes

- [`313faf6`](https://github.com/firebase/firebase-js-sdk/commit/313faf66b88ac5ff60a6301b58bd3b9a71ffe74e) [#8749](https://github.com/firebase/firebase-js-sdk/pull/8749) - Add custom request headers based on the type of SDK (JS/TS, React, Angular, etc) that's invoking Data Connect requests. This will help us understand how users interact with Data Connect when using the Web SDK.

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 0.2.0

### Minor Changes

- [`c19a051ce`](https://github.com/firebase/firebase-js-sdk/commit/c19a051ce490398f49fbf9bdb7181a986b66fa14) [#8667](https://github.com/firebase/firebase-js-sdk/pull/8667) - Updated to include promise instead of promiselike

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 0.1.3

### Patch Changes

- [`cb4309f13`](https://github.com/firebase/firebase-js-sdk/commit/cb4309f13a01a6c66eb502ae6f5d6fa93560ab06) [#8664](https://github.com/firebase/firebase-js-sdk/pull/8664) - Fixed issue where multiple calls to connectDataConnectEmulator caused an exception

## 0.1.2

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/auth-interop-types@0.2.4
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 0.1.1

### Patch Changes

- [`cf988b0b1`](https://github.com/firebase/firebase-js-sdk/commit/cf988b0b1217a06e5d1b9130d6048178626dac48) [#8570](https://github.com/firebase/firebase-js-sdk/pull/8570) - - Throw error when calling `executeQuery` with mutations

- [`813b9fad6`](https://github.com/firebase/firebase-js-sdk/commit/813b9fad63ff7b8798e4f4e17ccd528a784698d9) [#8565](https://github.com/firebase/firebase-js-sdk/pull/8565) - - Modified user agent to use language instead of platform

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 0.1.0

### Minor Changes

- [`beaa4dffb`](https://github.com/firebase/firebase-js-sdk/commit/beaa4dffb7f48cb12ccc6c1d1b7cdc9c3605fc04) [#8480](https://github.com/firebase/firebase-js-sdk/pull/8480) - Included Data Connect product.

* Added app check support # @firebase/data-connect

## 0.0.3

- Updated reporting to use @firebase/data-connect instead of @firebase/connect.
- Added functionality to retry queries and mutations if the server responds with UNAUTHENTICATED.
- Moved `validateArgs` to core SDK.
- Updated errors to only show relevant details to the user.
- Added ability to track whether user is calling core sdk or generated sdk.
