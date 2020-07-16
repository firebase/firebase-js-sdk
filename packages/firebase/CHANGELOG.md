# firebase

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
