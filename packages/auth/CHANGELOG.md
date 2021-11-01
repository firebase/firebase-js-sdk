# @firebase/auth

## 0.19.0

### Minor Changes

- [`b6f30c24f`](https://github.com/firebase/firebase-js-sdk/commit/b6f30c24fdf096ac4e8bdba32b9c1380903a7507) [#5617](https://github.com/firebase/firebase-js-sdk/pull/5617) (fixes [#5610](https://github.com/firebase/firebase-js-sdk/issues/5610)) - Fix behavior on subsequent calls to `getRedirectResult()`

### Patch Changes

- [`69ff8eb54`](https://github.com/firebase/firebase-js-sdk/commit/69ff8eb549e49de51cae11a04bce023bb6e1fc02) [#5616](https://github.com/firebase/firebase-js-sdk/pull/5616) - Fix the public `AuthError` typing, and update the `MultiFactorError` implementation to follow the new standard (all fields listed under `customData`)

* [`2429ac105`](https://github.com/firebase/firebase-js-sdk/commit/2429ac105b0aeb15eb8c362665448c209887bada) [#5633](https://github.com/firebase/firebase-js-sdk/pull/5633) (fixes [#5631](https://github.com/firebase/firebase-js-sdk/issues/5631)) - Add the attribute `aria-hidden="true"` to the embedded iframe

- [`4594d3fd6`](https://github.com/firebase/firebase-js-sdk/commit/4594d3fd6c7f7680b877aa2017ba35084ef6af96) [#5673](https://github.com/firebase/firebase-js-sdk/pull/5673) - Export Phone sign in functionality in React Native entrypoint (except for RecaptchaVerifier)

* [`6dacc2400`](https://github.com/firebase/firebase-js-sdk/commit/6dacc2400fdcf4432ed1977ca1eb148da6db3fc5) [#5635](https://github.com/firebase/firebase-js-sdk/pull/5635) (fixes [#5618](https://github.com/firebase/firebase-js-sdk/issues/5618)) - Make the library resilient against localStorage and sessionStorage permissions errors

## 0.18.3

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 0.18.2

### Patch Changes

- [`1b0e7af13`](https://github.com/firebase/firebase-js-sdk/commit/1b0e7af130c59b867e84b3f2615248fedad5b83d) [#5564](https://github.com/firebase/firebase-js-sdk/pull/5564) - Calls to `connectAuthEmulator` with the `disableWarnings` flag set to true will no longer cause a `console.info` warning to be printed

* [`e1d551ddb`](https://github.com/firebase/firebase-js-sdk/commit/e1d551ddb29db0f1fdf25c986cfcae6804bc8e79) [#5574](https://github.com/firebase/firebase-js-sdk/pull/5574) (fixes [#5553](https://github.com/firebase/firebase-js-sdk/issues/5553)) - Fix bug in the `OAuthProvider.prototype.credential` method that was preventing the `rawNonce` field from being populated in the returned `OAuthCredential`.

- [`f7d8324a1`](https://github.com/firebase/firebase-js-sdk/commit/f7d8324a188f013f7875cf6c35fc4beb2c78c0ae) [#5562](https://github.com/firebase/firebase-js-sdk/pull/5562) - Attempt to fix bug in compatability layer in Safari ("Right side of assignment cannot be destructured")

* [`e456d00a7`](https://github.com/firebase/firebase-js-sdk/commit/e456d00a7d054b2e95476562a087f2b12301e800) [#5577](https://github.com/firebase/firebase-js-sdk/pull/5577) - Fix bug where `user.tenantId` wasn't being carried over in `updateCurrentUser` function

## 0.18.1

### Patch Changes

- [`49b0406ab`](https://github.com/firebase/firebase-js-sdk/commit/49b0406abb9b211c5b75325b0383539ac03358d1) [#5542](https://github.com/firebase/firebase-js-sdk/pull/5542) (fixes [#5541](https://github.com/firebase/firebase-js-sdk/issues/5541)) - Fix incorrectly-cased parameter in out-of-band request that was causing incorrect behavior in some cases

## 0.18.0

### Minor Changes

- [`4d2a54fb0`](https://github.com/firebase/firebase-js-sdk/commit/4d2a54fb0611ab1987ad415c265440b9bbbc28c6) [#5527](https://github.com/firebase/firebase-js-sdk/pull/5527) - Update all persistences to map to `inMemoryPersistence` in Node, to avoid errors with server-side rendering

### Patch Changes

- [`a5d87bc5c`](https://github.com/firebase/firebase-js-sdk/commit/a5d87bc5c5d6360d5fa2386fe351937463bc45b8) [#5511](https://github.com/firebase/firebase-js-sdk/pull/5511) - Fix bug with the user `emailVerified` field persistence across tabs

* [`07b88e6e8`](https://github.com/firebase/firebase-js-sdk/commit/07b88e6e80f60525c66bf330d28160dbef2d0a2c) [#5487](https://github.com/firebase/firebase-js-sdk/pull/5487) - Add missing phone FACTOR_ID static property to the PhoneMultiFactorGenerator class

- [`c2362214a`](https://github.com/firebase/firebase-js-sdk/commit/c2362214ad6154ce013d3815a6f1ccd061679f66) [#5522](https://github.com/firebase/firebase-js-sdk/pull/5522) - Fix wrongly-typed tenantId fields in requests to some endpoints

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.17.2

### Patch Changes

- [`08ec55d6d`](https://github.com/firebase/firebase-js-sdk/commit/08ec55d6dfcc85207fbdcdde77d6508f27998603) [#5423](https://github.com/firebase/firebase-js-sdk/pull/5423) - Fix bug where custom errors from blocking functions were being dropped.

* [`271303f3c`](https://github.com/firebase/firebase-js-sdk/commit/271303f3ca6fa47c646177a41d7a3e3f31e1d296) [#5460](https://github.com/firebase/firebase-js-sdk/pull/5460) - Remove `const enum`s from the public typing file.

## 0.17.1

### Patch Changes

- [`66596f3f8`](https://github.com/firebase/firebase-js-sdk/commit/66596f3f8c747158bf30b62d8f579f7eecf97081) [#5397](https://github.com/firebase/firebase-js-sdk/pull/5397) (fixes [#5392](https://github.com/firebase/firebase-js-sdk/issues/5392)) - Fix typings where the constructor of `OAuthProvider` was missing.

## 0.17.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.16.8

### Patch Changes

- [`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5) [#5071](https://github.com/firebase/firebase-js-sdk/pull/5071) (fixes [#4932](https://github.com/firebase/firebase-js-sdk/issues/4932)) - Auto initialize `auth-internal` after `auth` has been initialized.

## 0.16.7

### Patch Changes

- [`c81cf82fa`](https://github.com/firebase/firebase-js-sdk/commit/c81cf82fac14cbfaebc0e440235c3fb38af22d38) [#4966](https://github.com/firebase/firebase-js-sdk/pull/4966) (fixes [#4879](https://github.com/firebase/firebase-js-sdk/issues/4879)) - Fix bug where `linkWithPopup`, `linkWithRedirect`, `reauthenticateWithPopup`, and `reauthenticateWithRedirect` weren't correctly picking up the emulator configuration.

## 0.16.6

### Patch Changes

- [`de68cdca2`](https://github.com/firebase/firebase-js-sdk/commit/de68cdca21c6ba5a890807857b529c2187e4adba) [#4868](https://github.com/firebase/firebase-js-sdk/pull/4868) (fixes [#4867](https://github.com/firebase/firebase-js-sdk/issues/4867)) - Ensure emulator warning text is accessible.

## 0.16.5

### Patch Changes

- Updated dependencies [[`3f370215a`](https://github.com/firebase/firebase-js-sdk/commit/3f370215aa571db6b41b92a7d8a9aaad2ea0ecd0)]:
  - @firebase/auth-types@0.10.3

## 0.16.4

### Patch Changes

- Updated dependencies [[`4ab5a9ce5`](https://github.com/firebase/firebase-js-sdk/commit/4ab5a9ce5b6256a95d745f6dc40a5e5ddd2301f2)]:
  - @firebase/auth-types@0.10.2

## 0.16.3

### Patch Changes

- [`73bb561e1`](https://github.com/firebase/firebase-js-sdk/commit/73bb561e18ea42286a54d28648636bf1ac7fcfe0) [#4357](https://github.com/firebase/firebase-js-sdk/pull/4357) (fixes [#4174](https://github.com/firebase/firebase-js-sdk/issues/4174)) - Decode UTF-8 in ID Token. Fix #4174.

## 0.16.2

### Patch Changes

- [`92a7f4345`](https://github.com/firebase/firebase-js-sdk/commit/92a7f434536051bedd00bc1be7e774174378aa7d) [#4280](https://github.com/firebase/firebase-js-sdk/pull/4280) - Add the `useEmulator()` function and `emulatorConfig` to the `firebase` package externs

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
