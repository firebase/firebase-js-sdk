# @firebase/auth

## 0.21.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- [`e650f6498`](https://github.com/firebase/firebase-js-sdk/commit/e650f649854f3c39737fe4bade43f9eedc3e611f) [#6762](https://github.com/firebase/firebase-js-sdk/pull/6762) (fixes [#6736](https://github.com/firebase/firebase-js-sdk/issues/6736)) - move selenium-webdriver to devDependencies

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0
  - @firebase/logger@0.4.0

## 0.20.11

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3

## 0.20.10

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.20.9

### Patch Changes

- Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.20.8

### Patch Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.20.7

### Patch Changes

- [`e06d9069c`](https://github.com/firebase/firebase-js-sdk/commit/e06d9069ca07429df248d9134aebdea1118e9427) [#6594](https://github.com/firebase/firebase-js-sdk/pull/6594) - Included a reference to AuthInternal in MultiFactorSessionImpl.

* [`666c8ec1f`](https://github.com/firebase/firebase-js-sdk/commit/666c8ec1ff5cb5b8947a142e26c0a2ecb18f8bb4) [#6569](https://github.com/firebase/firebase-js-sdk/pull/6569) (fixes [#6553](https://github.com/firebase/firebase-js-sdk/issues/6553)) - Update custom claim type of `ParsedToken` to be `any`

## 0.20.6

### Patch Changes

- [`bea604ea3`](https://github.com/firebase/firebase-js-sdk/commit/bea604ea33c529e755cc3fcdc0a2ea75d04b9f19) [#6544](https://github.com/firebase/firebase-js-sdk/pull/6544) - Fix proactive refresh logic in Auth when RTDB/Firestore/Storage are in use

## 0.20.5

### Patch Changes

- [`1261d8323`](https://github.com/firebase/firebase-js-sdk/commit/1261d832345ff4505391a150cb9c32719da37eb0) [#6421](https://github.com/firebase/firebase-js-sdk/pull/6421) (fixes [#6133](https://github.com/firebase/firebase-js-sdk/issues/6133)) - Fix a bug causing ReCAPTCHA conflicts between Auth and App Check.

* [`8c52a96ed`](https://github.com/firebase/firebase-js-sdk/commit/8c52a96edac5b65501ee4eeb234c4bb8e70a5dd5) [#6379](https://github.com/firebase/firebase-js-sdk/pull/6379) (fixes [#6331](https://github.com/firebase/firebase-js-sdk/issues/6331)) - Update user agent detection to better detect iPad; fixes bug for some iPad devices running Cordova apps

* Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.20.4

### Patch Changes

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.20.3

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

* [`d4b52b612`](https://github.com/firebase/firebase-js-sdk/commit/d4b52b612cf73610c57a3c08a0415ab7b622a70a) [#6321](https://github.com/firebase/firebase-js-sdk/pull/6321) - Fix incorrect paths in package.json

* Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1

## 0.20.2

### Patch Changes

- [`63ac2ed28`](https://github.com/firebase/firebase-js-sdk/commit/63ac2ed28f237950290a7af2dcdcf1518ddaee4b) - Add missing field to `firebase` claim in token result typing

* [`88517b591`](https://github.com/firebase/firebase-js-sdk/commit/88517b59179410e43d5d5129a1fefc355cd1d4eb) [#6289](https://github.com/firebase/firebase-js-sdk/pull/6289) - Propagate customData in FirebaseError when the user is disabled.

## 0.20.1

### Patch Changes

- [`07cf0f1c9`](https://github.com/firebase/firebase-js-sdk/commit/07cf0f1c9033373bf1d3a8a1958385f177506c6c) [#6248](https://github.com/firebase/firebase-js-sdk/pull/6248) (fixes [#6246](https://github.com/firebase/firebase-js-sdk/issues/6246)) - Add `@internal` tags to fix public typings file.

## 0.20.0

### Minor Changes

- [`1ac3c9d41`](https://github.com/firebase/firebase-js-sdk/commit/1ac3c9d41e8f69a94c64c6e0caf5f1a159b7dc3c) [#6151](https://github.com/firebase/firebase-js-sdk/pull/6151) - Add `beforeAuthStateChanged()` middleware function which allows the user to provide callbacks that are run before an auth state change
  sets a new user.

### Patch Changes

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.19.12

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.19.11

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.19.10

### Patch Changes

- [`7405e7d59`](https://github.com/firebase/firebase-js-sdk/commit/7405e7d593b40c9945c32ffbe66ac6fb11e2991e) [#6033](https://github.com/firebase/firebase-js-sdk/pull/6033) - Heartbeat

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.19.9

### Patch Changes

- [`3a8d4c1d1`](https://github.com/firebase/firebase-js-sdk/commit/3a8d4c1d1a5e5fda5906b1feb96324efb68739cd) [#6007](https://github.com/firebase/firebase-js-sdk/pull/6007) - Update chromedriver version number (dev dependency)

## 0.19.8

### Patch Changes

- [`af9234866`](https://github.com/firebase/firebase-js-sdk/commit/af923486662bc9449cca122b55840b045c9b4a5a) [#5938](https://github.com/firebase/firebase-js-sdk/pull/5938) (fixes [#917](https://github.com/firebase/firebase-js-sdk/issues/917)) - Fix bug where `user.providerData` field was being improperly initialized

## 0.19.7

### Patch Changes

- [`4983f4d5a`](https://github.com/firebase/firebase-js-sdk/commit/4983f4d5a0dc385c5b3e042ace44c8204d3cce81) [#5923](https://github.com/firebase/firebase-js-sdk/pull/5923) - Fix errors in compatibility layer when cookies are fully disabled in Chrome

* [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

- [`e04b7452b`](https://github.com/firebase/firebase-js-sdk/commit/e04b7452bae10e6525cfb9c551f76a1aa98f9078) [#5924](https://github.com/firebase/firebase-js-sdk/pull/5924) (fixes [#5922](https://github.com/firebase/firebase-js-sdk/issues/5922)) - Add missing PhoneMultiFactorInfo public interface

* [`2820674b8`](https://github.com/firebase/firebase-js-sdk/commit/2820674b848e918ab164e7d0ec9d5b838bbfa6e0) [#5927](https://github.com/firebase/firebase-js-sdk/pull/5927) - Prevent React Native from logging a warning about deprecation of `AsyncStorage` if the developer has provided the non-deprecated version.

## 0.19.6

### Patch Changes

- [`67b6decbb`](https://github.com/firebase/firebase-js-sdk/commit/67b6decbb9b5ee806d4109b9b6c188c4933e1270) [#5908](https://github.com/firebase/firebase-js-sdk/pull/5908) - Add cordova and react-native paths to auth package.json exports field.

* [`922e9ed9a`](https://github.com/firebase/firebase-js-sdk/commit/922e9ed9a68c130aefa0cdb9b27720b73011c397) [#5892](https://github.com/firebase/firebase-js-sdk/pull/5892) (fixes [#5874](https://github.com/firebase/firebase-js-sdk/issues/5874)) - Fix error code thrown when the network times out

## 0.19.5

### Patch Changes

- [`e3a5248fc`](https://github.com/firebase/firebase-js-sdk/commit/e3a5248fc8536fe2ca6d97483aa7e1b3f737dd17) [#5811](https://github.com/firebase/firebase-js-sdk/pull/5811) (fixes [#5791](https://github.com/firebase/firebase-js-sdk/issues/5791)) - Fix persistence selection in compatibility layer in worker scripts

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.19.4

### Patch Changes

- [`a777385d6`](https://github.com/firebase/firebase-js-sdk/commit/a777385d67653cdcc3b839149dde867f32b48369) [#5799](https://github.com/firebase/firebase-js-sdk/pull/5799) - Add X-Firebase-gmpid header to requests

* [`dc6b447ba`](https://github.com/firebase/firebase-js-sdk/commit/dc6b447bac4e899a0c4741ec18bf19e2ae66731a) [#5777](https://github.com/firebase/firebase-js-sdk/pull/5777) (fixes [#5720](https://github.com/firebase/firebase-js-sdk/issues/5720)) - Fix errors during Auth initialization when the network is unavailable

## 0.19.3

### Patch Changes

- [`1583a8202`](https://github.com/firebase/firebase-js-sdk/commit/1583a82022bfd404e94f28d1786e596d6b5a9f43) [#5715](https://github.com/firebase/firebase-js-sdk/pull/5715) - Fix Provider.credentialFromResult documentation snippets

## 0.19.2

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

* [`dbd54f7c9`](https://github.com/firebase/firebase-js-sdk/commit/dbd54f7c9ef0b5d78d491e26d816084a478bdf04) [#5700](https://github.com/firebase/firebase-js-sdk/pull/5700) (fixes [#5631](https://github.com/firebase/firebase-js-sdk/issues/5631)) - Fix lighthouse issues related to the embedded iframe used to perform OAuth sign in.

* Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2

## 0.19.1

### Patch Changes

- [`31bd6f27f`](https://github.com/firebase/firebase-js-sdk/commit/31bd6f27f965a561f814bad1110a43849a6a9cbf) [#5689](https://github.com/firebase/firebase-js-sdk/pull/5689) - Add SAMLAuthProvider to the compatability layer (it was missing before)

* [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- [`0765b5e19`](https://github.com/firebase/firebase-js-sdk/commit/0765b5e19c3e949bb33233ee52c8e33f01418e54) [#5686](https://github.com/firebase/firebase-js-sdk/pull/5686) (fixes [#5685](https://github.com/firebase/firebase-js-sdk/issues/5685)) - Fix bug that caused onAuthStateChanged to be fired twice

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1

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
