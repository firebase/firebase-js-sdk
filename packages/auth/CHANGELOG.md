# @firebase/auth

## 0.16.1

### Patch Changes

- [`9fd3f5233`](https://github.com/firebase/firebase-js-sdk/commit/9fd3f5233077b45c5101789c427db51835484ce0) [#4210](https://github.com/firebase/firebase-js-sdk/pull/4210) - Update auth token logic to rely on device clock time instead of server time. This fixes an issue seen when a device's clock is skewed by a lot: https://github.com/firebase/firebase-js-sdk/issues/3222

## 0.16.0

### Minor Changes

- [`c9f379cf7`](https://github.com/firebase/firebase-js-sdk/commit/c9f379cf7ef2c5938512a45b63008bbb135926ed) [#4112](https://github.com/firebase/firebase-js-sdk/pull/4112) - Add option to hide banner in auth when using the emulator

## 0.15.3

### Patch Changes

- [`11563b227`](https://github.com/firebase/firebase-js-sdk/commit/11563b227f30c9282c45e4a8128d5679954dcfd1) [#4146](https://github.com/firebase/firebase-js-sdk/pull/4146) - Fix issue with IndexedDB retry logic causing uncaught errors

## 0.15.2

### Patch Changes

- [`c2b215c19`](https://github.com/firebase/firebase-js-sdk/commit/c2b215c1950b2f75abb6a8dd58544a79bda968f6) [#4059](https://github.com/firebase/firebase-js-sdk/pull/4059) (fixes [#1926](https://github.com/firebase/firebase-js-sdk/issues/1926)) - Retry IndexedDB errors a fixed number of times to handle connection issues in mobile webkit.

## 0.15.1

### Patch Changes

- [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487) [#3932](https://github.com/firebase/firebase-js-sdk/pull/3932) - Point browser field to esm build. Now you need to use default import instead of namespace import to import firebase.

  Before this change

  ```
  import * as firebase from 'firebase/app';
  ```

  After this change

  ```
  import firebase from 'firebase/app';
  ```

## 0.15.0

### Minor Changes

- [`eeb1dfa4f`](https://github.com/firebase/firebase-js-sdk/commit/eeb1dfa4f629dc5cf328e4b4a224369c0670c312) [#3810](https://github.com/firebase/firebase-js-sdk/pull/3810) - Add ability to configure the SDK to communicate with the Firebase Auth emulator.

### Patch Changes

- [`916770f3c`](https://github.com/firebase/firebase-js-sdk/commit/916770f3cfc0ca9eae92fbf33558b7175cf2cf78) [#3934](https://github.com/firebase/firebase-js-sdk/pull/3934) - Add a validation for useEmulator URL.

## 0.14.9

### Patch Changes

- [`b6145466`](https://github.com/firebase/firebase-js-sdk/commit/b6145466835e22495b94d2bcfc45813e81496085) [#3401](https://github.com/firebase/firebase-js-sdk/pull/3401) Thanks [@Feiyang1](https://github.com/Feiyang1)! - Add browser field in package.json

## 0.14.8

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5
