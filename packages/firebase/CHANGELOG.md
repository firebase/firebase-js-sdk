# firebase

## 7.19.0

### Minor Changes

- [`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e) [#3424](https://github.com/firebase/firebase-js-sdk/pull/3424) - Issue 2393 - Add environment check to Performance Module

### Patch Changes

- Updated dependencies [[`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e), [`960093d5b`](https://github.com/firebase/firebase-js-sdk/commit/960093d5b3ada866709c1a51b4ca175c3a01f1f3), [`b97c7e758`](https://github.com/firebase/firebase-js-sdk/commit/b97c7e758b1e2a370cb72a7aac14c17a54531a36)]:
  - @firebase/performance@0.4.0
  - @firebase/firestore@1.16.5

## 7.18.0

### Minor Changes

- [`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c) [#3234](https://github.com/firebase/firebase-js-sdk/pull/3234) - Add `getToken(options:{serviceWorkerRegistration, vapidKey})`,`onBackgroundMessage`.
  Deprecate `setBackgroundMessageHandler`, `onTokenRefresh`, `useVapidKey`, `useServiceWorker`, `getToken`.

  Add Typing `MessagePayload`, `NotificationPayload`, `FcmOptions`.

### Patch Changes

- [`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089) [#3585](https://github.com/firebase/firebase-js-sdk/pull/3585) - Extended Usage of `isIndexedDBAvailable` to Service Worker

* [`2a0d254f`](https://github.com/firebase/firebase-js-sdk/commit/2a0d254fa58e607842fc0380c8cfa7bbbb69df75) [#3555](https://github.com/firebase/firebase-js-sdk/pull/3555) - Added Browser Extension check for Firebase Analytics. `analytics.isSupported()` will now return `Promise<false>` for extension environments.

* Updated dependencies [[`36be62a8`](https://github.com/firebase/firebase-js-sdk/commit/36be62a85c3cc47c15c9a59f20cdfcd7d0a72ad9), [`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089), [`2a0d254f`](https://github.com/firebase/firebase-js-sdk/commit/2a0d254fa58e607842fc0380c8cfa7bbbb69df75), [`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c), [`68995c24`](https://github.com/firebase/firebase-js-sdk/commit/68995c2422a479d42b9c972bab3da4d544b9f002)]:
  - @firebase/firestore@1.16.4
  - @firebase/util@0.3.1
  - @firebase/analytics@0.4.2
  - @firebase/messaging@0.7.0
  - @firebase/app@0.6.10
  - @firebase/database@0.6.11
  - @firebase/installations@0.4.16
  - @firebase/performance@0.3.11
  - @firebase/remote-config@0.1.27
  - @firebase/storage@0.3.42
  - @firebase/functions@0.4.50

## 7.17.2

### Patch Changes

- Updated dependencies [[`ef348fed`](https://github.com/firebase/firebase-js-sdk/commit/ef348fed291338351706a697cbb9fb17a9d06ff4)]:
  - @firebase/database@0.6.10
  - @firebase/firestore@1.16.3

## 7.17.1

### Patch Changes

- [`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c) [#3472](https://github.com/firebase/firebase-js-sdk/pull/3472) - - Fix an error where an analytics PR included a change to `@firebase/util`, but
  the util package was not properly included in the changeset for a patch bump.

  - `@firebase/util` adds environment check methods `isIndexedDBAvailable`
    `validateIndexedDBOpenable`, and `areCookiesEnabled`.

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/analytics@0.4.1
  - @firebase/util@0.3.0
  - @firebase/app@0.6.9
  - @firebase/database@0.6.9
  - @firebase/firestore@1.16.2
  - @firebase/installations@0.4.15
  - @firebase/messaging@0.6.21
  - @firebase/performance@0.3.10
  - @firebase/remote-config@0.1.26
  - @firebase/storage@0.3.41
  - @firebase/functions@0.4.49

## 7.17.0

### Minor Changes

- [`02419ce8`](https://github.com/firebase/firebase-js-sdk/commit/02419ce8470141f012d9ce425a6a4a4aa912e480) [#3165](https://github.com/firebase/firebase-js-sdk/pull/3165) - Issue 2393 fix - analytics module

  - Added a public method `isSupported` to Analytics module which returns true if current browser context supports initialization of analytics module.
  - Added runtime checks to Analytics module that validate if cookie is enabled in current browser and if current browser environment supports indexedDB functionalities.

### Patch Changes

- Updated dependencies [[`02419ce8`](https://github.com/firebase/firebase-js-sdk/commit/02419ce8470141f012d9ce425a6a4a4aa912e480), [`ee33ebf7`](https://github.com/firebase/firebase-js-sdk/commit/ee33ebf726b1dc31ab4817e7a1923f7b2757e17c)]:
  - @firebase/analytics@0.4.0
  - @firebase/storage@0.3.40

## 7.16.1

### Patch Changes

- [`9c409ea7`](https://github.com/firebase/firebase-js-sdk/commit/9c409ea74efd00fe17058c5c8b74450fae67e9ee) [#3224](https://github.com/firebase/firebase-js-sdk/pull/3224) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fix] Updated the TypeScript types for all APIs using Observers to allow callback omission.

* [`5a355360`](https://github.com/firebase/firebase-js-sdk/commit/5a3553609da893d45f7fe1897387f72eaedf2fe0) [#3162](https://github.com/firebase/firebase-js-sdk/pull/3162) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - The SDK no longer crashes if an IndexedDB failure occurs when unsubscribing from a Query.

- [`c2b737b2`](https://github.com/firebase/firebase-js-sdk/commit/c2b737b2187cb525af4d926ca477102db7835420) [#3228](https://github.com/firebase/firebase-js-sdk/pull/3228) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fix] Instead of using production auth, the SDK will use test credentials
  to connect to the Emulator when the RTDB SDK is used via the Firebase
  Admin SDK.

* [`9a9a81fe`](https://github.com/firebase/firebase-js-sdk/commit/9a9a81fe4f001f23e9fe1db054c2e7159fca3ae3) [#3279](https://github.com/firebase/firebase-js-sdk/pull/3279) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fixed] Removed a delay that may have prevented Firestore from immediately
  reestablishing a network connection if a connectivity change occurred while
  the app was in the background.
* Updated dependencies [[`b6145466`](https://github.com/firebase/firebase-js-sdk/commit/b6145466835e22495b94d2bcfc45813e81496085), [`9c409ea7`](https://github.com/firebase/firebase-js-sdk/commit/9c409ea74efd00fe17058c5c8b74450fae67e9ee), [`5a355360`](https://github.com/firebase/firebase-js-sdk/commit/5a3553609da893d45f7fe1897387f72eaedf2fe0), [`c2b737b2`](https://github.com/firebase/firebase-js-sdk/commit/c2b737b2187cb525af4d926ca477102db7835420), [`9a9a81fe`](https://github.com/firebase/firebase-js-sdk/commit/9a9a81fe4f001f23e9fe1db054c2e7159fca3ae3)]:
  - @firebase/auth@0.14.9
  - @firebase/storage@0.3.39
  - @firebase/firestore@1.16.1
  - @firebase/database@0.6.8

## 7.16.0

### Minor Changes

- [`39ca8ecf`](https://github.com/firebase/firebase-js-sdk/commit/39ca8ecf940472159d0bc58212f34a70146da60c) [#3254](https://github.com/firebase/firebase-js-sdk/pull/3254) Thanks [@thebrianchen](https://github.com/thebrianchen)! - Added support for `set()` with merge options when using `FirestoreDataConverter`.

* [`877c060c`](https://github.com/firebase/firebase-js-sdk/commit/877c060c47bb29a8efbd2b96d35d3334fd9d9a98) [#3251](https://github.com/firebase/firebase-js-sdk/pull/3251) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - Re-adding the ReactNative bundle, which allows Firestore to be used without `btoa`/`atob` Polyfills.

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

* [`17c628eb`](https://github.com/firebase/firebase-js-sdk/commit/17c628eb228c21ad1d4db83fdae08d1142a2b902) [#3312](https://github.com/firebase/firebase-js-sdk/pull/3312) Thanks [@Feiyang1](https://github.com/Feiyang1)! - Fixed an issue where we try to update token for every getToken() call because we don't save the updated token in the IndexedDB.

- [`bb740836`](https://github.com/firebase/firebase-js-sdk/commit/bb7408361519aa9a58c8256ae01914cf2830e118) [#3330](https://github.com/firebase/firebase-js-sdk/pull/3330) Thanks [@Feiyang1](https://github.com/Feiyang1)! - Clear timeout after a successful response or after the request is canceled. Fixes [issue 3289](https://github.com/firebase/firebase-js-sdk/issues/3289).

* [`e90304c8`](https://github.com/firebase/firebase-js-sdk/commit/e90304c8ac4341d8b23b55da784eb21348b04025) [#3309](https://github.com/firebase/firebase-js-sdk/pull/3309) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - Removed internal wrapper around our public API that was meant to prevent incorrect SDK usage for JavaScript users, but caused our SDK to stop working in IE11.

- [`469c8bdf`](https://github.com/firebase/firebase-js-sdk/commit/469c8bdf18c4a22e99d595a9896af2f934df20fd) [#3221](https://github.com/firebase/firebase-js-sdk/pull/3221) Thanks [@zwu52](https://github.com/zwu52)! - Added support for `onMessage` so the internal callback can work with [Subscriber](https://rxjs.dev/api/index/class/Subscriber)

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e), [`17c628eb`](https://github.com/firebase/firebase-js-sdk/commit/17c628eb228c21ad1d4db83fdae08d1142a2b902), [`bb740836`](https://github.com/firebase/firebase-js-sdk/commit/bb7408361519aa9a58c8256ae01914cf2830e118), [`39ca8ecf`](https://github.com/firebase/firebase-js-sdk/commit/39ca8ecf940472159d0bc58212f34a70146da60c), [`877c060c`](https://github.com/firebase/firebase-js-sdk/commit/877c060c47bb29a8efbd2b96d35d3334fd9d9a98), [`e90304c8`](https://github.com/firebase/firebase-js-sdk/commit/e90304c8ac4341d8b23b55da784eb21348b04025), [`469c8bdf`](https://github.com/firebase/firebase-js-sdk/commit/469c8bdf18c4a22e99d595a9896af2f934df20fd)]:
  - @firebase/analytics@0.3.9
  - @firebase/app@0.6.8
  - @firebase/auth@0.14.8
  - @firebase/database@0.6.7
  - @firebase/firestore@1.16.0
  - @firebase/functions@0.4.48
  - @firebase/installations@0.4.14
  - @firebase/messaging@0.6.20
  - @firebase/performance@0.3.9
  - @firebase/remote-config@0.1.25
  - @firebase/storage@0.3.38
