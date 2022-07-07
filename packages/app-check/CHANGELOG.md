# @firebase/app-check

## 0.5.11

### Patch Changes

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.5.10

### Patch Changes

- [`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0) [#6363](https://github.com/firebase/firebase-js-sdk/pull/6363) - Extract uuid function into @firebase/util

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.5.9

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

- Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1

## 0.5.8

### Patch Changes

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.5.7

### Patch Changes

- [`38da5d9be`](https://github.com/firebase/firebase-js-sdk/commit/38da5d9be4a001038548947a85c9b612e5275e32) [#6136](https://github.com/firebase/firebase-js-sdk/pull/6136) - Update App Check to use v1 endpoint instead of v1beta endpoint for both reCAPTCHA v3 and reCAPTCHA Enterprise

## 0.5.6

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.5.5

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.5.4

### Patch Changes

- [`a7f4a2eb6`](https://github.com/firebase/firebase-js-sdk/commit/a7f4a2eb6ed08596dffe75825bca1a2034bfcd2e) [#5967](https://github.com/firebase/firebase-js-sdk/pull/5967) - Update platform logging to use new endpoint.

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.5.3

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.5.2

### Patch Changes

- [`6f0049e66`](https://github.com/firebase/firebase-js-sdk/commit/6f0049e66064809ae990a2d9461e28b2d6d08d19) [#5676](https://github.com/firebase/firebase-js-sdk/pull/5676) - Block exchange requests for certain periods of time after certain error codes to prevent overwhelming the endpoint. Start token listener when App Check is initialized to avoid extra wait time on first getToken() call.

## 0.5.1

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2

## 0.5.0

### Minor Changes

- [`61604979c`](https://github.com/firebase/firebase-js-sdk/commit/61604979cb35647610ea385a6ba0ca67cb03f5d1) [#5595](https://github.com/firebase/firebase-js-sdk/pull/5595) - Add ReCAPTCHA Enterprise as an attestation option for App Check.

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1

## 0.4.2

### Patch Changes

- [`a4e770e58`](https://github.com/firebase/firebase-js-sdk/commit/a4e770e58d03d75a63f1ed7845589b863573b76e) [#5576](https://github.com/firebase/firebase-js-sdk/pull/5576) - Fix incorrect App Check typings that caused users to see TypeScript compile errors.

## 0.4.1

### Patch Changes

- [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422) [#5506](https://github.com/firebase/firebase-js-sdk/pull/5506) - AppCheck could encounter runtime errors when initialized in Node

* [`e62d02e52`](https://github.com/firebase/firebase-js-sdk/commit/e62d02e52e50fe53b3db90e9641df25a42742b15) [#5540](https://github.com/firebase/firebase-js-sdk/pull/5540) - Check for and initialize App Check debug mode during `initializeAppCheck()` instead of on import.

* Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.4.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.3.2

### Patch Changes

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/util@1.3.0

## 0.3.1

### Patch Changes

- [`f1027e3c2`](https://github.com/firebase/firebase-js-sdk/commit/f1027e3c24cab52046766a898c6702860f5ad3f6) [#5261](https://github.com/firebase/firebase-js-sdk/pull/5261) (fixes [#5258](https://github.com/firebase/firebase-js-sdk/issues/5258)) - Fixed argument typings for `activate()`.

- Updated dependencies [[`f1027e3c2`](https://github.com/firebase/firebase-js-sdk/commit/f1027e3c24cab52046766a898c6702860f5ad3f6)]:
  - @firebase/app-check-types@0.3.1

## 0.3.0

### Minor Changes

- [`8599d9141`](https://github.com/firebase/firebase-js-sdk/commit/8599d91416ae8ac5202742f11cee00666d3360ec) [#4902](https://github.com/firebase/firebase-js-sdk/pull/4902) - Add `RecaptchaV3Provider` and `CustomProvider` classes that can be supplied to `firebase.appCheck().activate()`.

### Patch Changes

- Updated dependencies [[`8599d9141`](https://github.com/firebase/firebase-js-sdk/commit/8599d91416ae8ac5202742f11cee00666d3360ec)]:
  - @firebase/app-check-types@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5

## 0.2.0

### Minor Changes

- [`870dd5e35`](https://github.com/firebase/firebase-js-sdk/commit/870dd5e3594f5b588bdc2801c60c6d984d1d08cc) [#5033](https://github.com/firebase/firebase-js-sdk/pull/5033) - Added `getToken()` and `onTokenChanged` methods to App Check.

### Patch Changes

- [`5d007b8fb`](https://github.com/firebase/firebase-js-sdk/commit/5d007b8fb64ac26c2f82704398965e9f3deda58a) [#5084](https://github.com/firebase/firebase-js-sdk/pull/5084) - Fixed so token listeners added through public API call the error handler while internal token listeners return the error as a token field.

* [`5d31e2192`](https://github.com/firebase/firebase-js-sdk/commit/5d31e2192d0ea68a768bc7826ad5aa830c2bc36c) [#5055](https://github.com/firebase/firebase-js-sdk/pull/5055) (fixes [#5052](https://github.com/firebase/firebase-js-sdk/issues/5052)) - Fix an error causing App Check to log `HTTP status 429` errors in debug mode.

* Updated dependencies [[`870dd5e35`](https://github.com/firebase/firebase-js-sdk/commit/870dd5e3594f5b588bdc2801c60c6d984d1d08cc), [`5d007b8fb`](https://github.com/firebase/firebase-js-sdk/commit/5d007b8fb64ac26c2f82704398965e9f3deda58a), [`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/app-check-types@0.2.0
  - @firebase/component@0.5.4

## 0.1.4

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 0.1.3

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 0.1.2

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 0.1.1

### Patch Changes

- [`60e834739`](https://github.com/firebase/firebase-js-sdk/commit/60e83473940e60f8390b1b0f97cf45a1733f66f0) [#4897](https://github.com/firebase/firebase-js-sdk/pull/4897) - Make App Check initialization explicit, to prevent unexpected errors for users who do not intend to use App Check.

## 0.1.0

### Minor Changes

- [`81c131abe`](https://github.com/firebase/firebase-js-sdk/commit/81c131abea7001c5933156ff6b0f3925f16ff052) [#4860](https://github.com/firebase/firebase-js-sdk/pull/4860) - Release the Firebase App Check package.

### Patch Changes

- Updated dependencies [[`81c131abe`](https://github.com/firebase/firebase-js-sdk/commit/81c131abea7001c5933156ff6b0f3925f16ff052)]:
  - @firebase/app-check-interop-types@0.1.0
  - @firebase/app-check-types@0.1.0

## 0.1.1

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/util@1.1.0
