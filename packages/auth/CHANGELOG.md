# @firebase/auth

## 1.11.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 1.10.8

### Patch Changes

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 1.10.7

### Patch Changes

- [`c0617a3`](https://github.com/firebase/firebase-js-sdk/commit/c0617a341a693c2578a21b35a4f7b27b726defef) [#9075](https://github.com/firebase/firebase-js-sdk/pull/9075) - Fixed issue where Firebase Auth cookie refresh attempts issues in Firebase Studio resulted in CORS errors.

## 1.10.6

### Patch Changes

- [`35ad526`](https://github.com/firebase/firebase-js-sdk/commit/35ad5266304e14425988fcf5ad06d028b37588ac) [#9053](https://github.com/firebase/firebase-js-sdk/pull/9053) - Revert "Fixed scroll behavior (#9043)"

- [`b5df4ae`](https://github.com/firebase/firebase-js-sdk/commit/b5df4ae71c1b5b54d9237e7929d0f793189b82c9) [#9055](https://github.com/firebase/firebase-js-sdk/pull/9055) - Updated to only show banner when calling connect\*Emulator

## 1.10.5

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 1.10.4

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 1.10.3

### Patch Changes

- [`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24) [#9031](https://github.com/firebase/firebase-js-sdk/pull/9031) - Add Emulator Overlay

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 1.10.2

### Patch Changes

- [`6a02778`](https://github.com/firebase/firebase-js-sdk/commit/6a02778e3d12af683e710b53dc6dfb64329e8229) [#8998](https://github.com/firebase/firebase-js-sdk/pull/8998) - Fix issue where auth port wasn't properly set when setting up cookies in Firebase Studio.

- [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb) [#8968](https://github.com/firebase/firebase-js-sdk/pull/8968) - Fix Auth Redirects on Firebase Studio

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 1.10.1

### Patch Changes

- [`1363ecc`](https://github.com/firebase/firebase-js-sdk/commit/1363ecc533de0ba5bfcae206a831acc33f9020a6) [#8912](https://github.com/firebase/firebase-js-sdk/pull/8912) - Fixed: `ActionCodeURL` not populating `languageCode` from the url.

## 1.10.0

### Minor Changes

- [`fb5d422`](https://github.com/firebase/firebase-js-sdk/commit/fb5d4227571e06df128048abf87cbb1da2ace1bc) [#8839](https://github.com/firebase/firebase-js-sdk/pull/8839) - Adding `Persistence.COOKIE` a new persistence method backed by cookies. The
  `browserCookiePersistence` implementation is designed to be used in conjunction with middleware that
  ensures both your front and backend authentication state remains synchronized.

## 1.9.1

### Patch Changes

- [`c791ecf`](https://github.com/firebase/firebase-js-sdk/commit/c791ecf3a03a0e4f56fcdc49b703578135bf8ce6) [#8750](https://github.com/firebase/firebase-js-sdk/pull/8750) - Fixed: invoking `connectAuthEmulator` multiple times with the same parameters will no longer cause
  an error. Fixes [GitHub Issue #6824](https://github.com/firebase/firebase-js-sdk/issues/6824).
- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 1.9.0

### Minor Changes

- [`9d88e3a`](https://github.com/firebase/firebase-js-sdk/commit/9d88e3a85a7253694dd7cf58d7eb834e41af2b79) [#8738](https://github.com/firebase/firebase-js-sdk/pull/8738) - Added `ActionCodeSettings.linkDomain` to customize the Firebase Hosting link domain that is used in mobile out-of-band email action flows. Also, deprecated `ActionCodeSettings.dynamicLinkDomain`.

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 1.8.2

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 1.8.1

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 1.8.0

### Minor Changes

- [`b942e9e6e`](https://github.com/firebase/firebase-js-sdk/commit/b942e9e6e22d184d21f3e452cd35122592a3a372) [#8568](https://github.com/firebase/firebase-js-sdk/pull/8568) - [feature] Added reCAPTCHA Enterprise support for app verification during phone authentication.

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 1.7.9

### Patch Changes

- [`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741) [#8393](https://github.com/firebase/firebase-js-sdk/pull/8393) - Suppress the use of the `fetch` parameter `referrerPolicy` within Auth for `fetch` requests originating from Cloudflare Workers. Clouldflare Worker environments do not support this parameter and throw when it's used.

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 1.7.8

### Patch Changes

- [`62348e116`](https://github.com/firebase/firebase-js-sdk/commit/62348e116c795d19c5ca58729c250805240ce345) [#8432](https://github.com/firebase/firebase-js-sdk/pull/8432) (fixes [#8431](https://github.com/firebase/firebase-js-sdk/issues/8431)) - Update undici dependency to 6.19.7 due to a memory leak in older versions.

## 1.7.7

### Patch Changes

- [`2ddbd4e49`](https://github.com/firebase/firebase-js-sdk/commit/2ddbd4e4900e148648a1bc4cb82932e096a7009e) [#8408](https://github.com/firebase/firebase-js-sdk/pull/8408) - Remove localStorage synchronization on storage events in Safari iframes. See [GitHub PR #8408](https://github.com/firebase/firebase-js-sdk/pull/8408).

## 1.7.6

### Patch Changes

- [`025f2a103`](https://github.com/firebase/firebase-js-sdk/commit/025f2a1037582da7d1afeb7a4d143cb7a154ec9d) [#8280](https://github.com/firebase/firebase-js-sdk/pull/8280) (fixes [#8279](https://github.com/firebase/firebase-js-sdk/issues/8279)) - Fixed typos in documentation and some internal variables and parameters.

## 1.7.5

### Patch Changes

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 1.7.4

### Patch Changes

- [`0af23e02e`](https://github.com/firebase/firebase-js-sdk/commit/0af23e02e0c90ae550dd3edf1c9244a8eba3aee1) [#8251](https://github.com/firebase/firebase-js-sdk/pull/8251) (fixes [#8222](https://github.com/firebase/firebase-js-sdk/issues/8222)) - Generate dts rollups for auth web extension and cordova

## 1.7.3

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6

## 1.7.2

### Patch Changes

- [`36b283f3f`](https://github.com/firebase/firebase-js-sdk/commit/36b283f3fc317d0fa7dde47e1048d2ee3690a9a0) [#8191](https://github.com/firebase/firebase-js-sdk/pull/8191) (fixes [#8115](https://github.com/firebase/firebase-js-sdk/issues/8115)) - Emit a module package file with esm2017 auth browser extension builds

- [`55fef6d62`](https://github.com/firebase/firebase-js-sdk/commit/55fef6d627791f4704194c3913ebeb339a564906) [#7001](https://github.com/firebase/firebase-js-sdk/pull/7001) - Update jszip transient dependency from 3.7.1 to 3.10.1 in auth.

## 1.7.1

### Patch Changes

- [`fe09d8338`](https://github.com/firebase/firebase-js-sdk/commit/fe09d8338d7d5f7a82d8cd73cf825adbe5551975) [#8138](https://github.com/firebase/firebase-js-sdk/pull/8138) (fixes [#8132](https://github.com/firebase/firebase-js-sdk/issues/8132)) - Update undici version to 5.28.4 due to CVE-2024-30260.

- [`ad8d5470d`](https://github.com/firebase/firebase-js-sdk/commit/ad8d5470dad9b9ec1bcd939609da4a1c439c8414) [#8134](https://github.com/firebase/firebase-js-sdk/pull/8134) - Updated dependencies. See GitHub PR #8098.

## 1.7.0

### Minor Changes

- [`ed84efe50`](https://github.com/firebase/firebase-js-sdk/commit/ed84efe50bfc365da8ebfacdd2b17b5cc2a9e596) [#8005](https://github.com/firebase/firebase-js-sdk/pull/8005) - Added the new `FirebaseServerApp` interface to bridge state
  data between client and server runtime environments. This interface extends `FirebaseApp`.

### Patch Changes

- [`9ca1a4e4f`](https://github.com/firebase/firebase-js-sdk/commit/9ca1a4e4f9f13d56cde93cab6d83a8bc54f83539) [#8076](https://github.com/firebase/firebase-js-sdk/pull/8076) - Additional protection against misuse of the authTokenSyncURL experiment

- [`c8a2568dd`](https://github.com/firebase/firebase-js-sdk/commit/c8a2568ddd2acd9162a99bce9ff4203fe8d6e0da) [#8097](https://github.com/firebase/firebase-js-sdk/pull/8097) - Updated transitive dependencies based on generated dependabot security reports. For more information see [PR #8088](https://github.com/firebase/firebase-js-sdk/pull/8088/files).

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/component@0.6.6
  - @firebase/logger@0.4.1
  - @firebase/util@1.9.5

## 1.6.2

### Patch Changes

- [`6d487d7de`](https://github.com/firebase/firebase-js-sdk/commit/6d487d7dee631498bed1aeccbb45d8f14ae911d1) [#8060](https://github.com/firebase/firebase-js-sdk/pull/8060) - Do not allow double slash at beginning of authTokenSyncURL. (follow-up fix to https://github.com/firebase/firebase-js-sdk/pull/8056)

- [`245dd26e1`](https://github.com/firebase/firebase-js-sdk/commit/245dd26e19b6c16aca7e1b7e597ed5784c2984ba) [#8056](https://github.com/firebase/firebase-js-sdk/pull/8056) - Fix possible XSS vulnerability through **FIREBASE_DEFAULTS** settings.

## 1.6.1

### Patch Changes

- [`f3cec28df`](https://github.com/firebase/firebase-js-sdk/commit/f3cec28dfbdfc7f19c8218cf9d26956235d03fb0) [#8044](https://github.com/firebase/firebase-js-sdk/pull/8044) (fixes [#8038](https://github.com/firebase/firebase-js-sdk/issues/8038)) - Bump undici version to 5.28.3 due to security issue.

## 1.6.0

### Minor Changes

- [`2f7ad0ac4`](https://github.com/firebase/firebase-js-sdk/commit/2f7ad0ac43f5d085604324f6dc3921d9420bfccd) [#8001](https://github.com/firebase/firebase-js-sdk/pull/8001) - Added a Web-Extension package that strips the external JS loading for developers to use when building Chrome Extension app.

### Patch Changes

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 1.5.1

### Patch Changes

- [`70e4cf6a6`](https://github.com/firebase/firebase-js-sdk/commit/70e4cf6a6544c4ccfa609c3f2c320980e7122101) [#7825](https://github.com/firebase/firebase-js-sdk/pull/7825) - Protection from enumerating an empty list in Auth's reading of IndexedDB results, as this causes errors in some macOS and iOS browser runtimes.

## 1.5.0

### Minor Changes

- [`bebecdaad`](https://github.com/firebase/firebase-js-sdk/commit/bebecdaad7fa552505055ab7705da478203078b6) [#7705](https://github.com/firebase/firebase-js-sdk/pull/7705) - Replaced node-fetch v2.6.7 dependency with the latest version of undici (v5.26.5) in Node.js SDK
  builds for auth, firestore, functions and storage.

### Patch Changes

- [`b2163b33d`](https://github.com/firebase/firebase-js-sdk/commit/b2163b33d4076ba69849c82751fe225dc989c9de) [#7772](https://github.com/firebase/firebase-js-sdk/pull/7772) - Exposed INVALID_LOGIN_CREDENTIALS as auth/invalid-credential error and updated docs for various auth SDK methods.

## 1.4.0

### Minor Changes

- [`5f496e401`](https://github.com/firebase/firebase-js-sdk/commit/5f496e401782db29afd1bd433818a3fc1ef1da3c) [#7745](https://github.com/firebase/firebase-js-sdk/pull/7745) - [feature] Add sign-in with Apple token revocation support.

### Patch Changes

- [`f10acb360`](https://github.com/firebase/firebase-js-sdk/commit/f10acb36009dc9d5d4f0d0880f1357330e3f1d1b) [#7692](https://github.com/firebase/firebase-js-sdk/pull/7692) - Fixes https://github.com/firebase/firebase-js-sdk/issues/7675

## 1.3.2

### Patch Changes

- [`33a2298af`](https://github.com/firebase/firebase-js-sdk/commit/33a2298af3dc669a23548ee1703de788435aa6b5) [#7720](https://github.com/firebase/firebase-js-sdk/pull/7720) - fixes github issue https://github.com/firebase/firebase-js-sdk/issues/7701.

## 1.3.1

### Patch Changes

- [`f002ef36a`](https://github.com/firebase/firebase-js-sdk/commit/f002ef36a6b427fd526696f9cd6077a217ccc6ef) [#7634](https://github.com/firebase/firebase-js-sdk/pull/7634) (fixes [#7633](https://github.com/firebase/firebase-js-sdk/issues/7633)) - Fix FetchProvider in non-browser environments, by trying to get the `fetch` implementation from not only `self` but also standard `globalThis`.

- [`68927ced1`](https://github.com/firebase/firebase-js-sdk/commit/68927ced1159d9b79407c7823d7f48d30ccb591e) [#7685](https://github.com/firebase/firebase-js-sdk/pull/7685) - Create getProviderEnforcementState method to get reCAPTCHA Enterprise enforcement state of a provider.
  This is an internal code change preparing for future features.

- [`3533b32b1`](https://github.com/firebase/firebase-js-sdk/commit/3533b32b1be6a9800b1b58a6a2b08f50fae18eeb) [#7666](https://github.com/firebase/firebase-js-sdk/pull/7666) - Create handleRecaptchaFlow helper method

## 1.3.0

### Minor Changes

- [`309f7a914`](https://github.com/firebase/firebase-js-sdk/commit/309f7a914a9bef1becaa354ac01786e44712e256) [#7570](https://github.com/firebase/firebase-js-sdk/pull/7570) - Remove dependency on @react-native-async-storage/async-storage and add warnings to remind React Native users to manually import it.

## 1.2.0

### Minor Changes

- [`c9e2b0b8c`](https://github.com/firebase/firebase-js-sdk/commit/c9e2b0b8cd5fd0db3cac7bc3a00629ae34302189) [#7514](https://github.com/firebase/firebase-js-sdk/pull/7514) - Add a validatePassword method for validating passwords against the password policy configured for the project or a tenant. This method returns a status object that can be used to display the requirements of the password policy and whether each one was met.

### Patch Changes

- [`5dac8b37a`](https://github.com/firebase/firebase-js-sdk/commit/5dac8b37a974309398317c5231ca6a41af2a48a5) [#7498](https://github.com/firebase/firebase-js-sdk/pull/7498) - Fix auth event uncancellable bug #7383

- [`6c7d07923`](https://github.com/firebase/firebase-js-sdk/commit/6c7d079231f393196aa68ef8d6463dc32ffce798) [#7284](https://github.com/firebase/firebase-js-sdk/pull/7284) - Raise error if calling initializeRecaptchaConfig in node env

## 1.1.0

### Minor Changes

- [`8e15973fd`](https://github.com/firebase/firebase-js-sdk/commit/8e15973fde994cbee0d5ce95af575a7565ef9d8b) [#7384](https://github.com/firebase/firebase-js-sdk/pull/7384) - Implemented `authStateReady()`, which returns a promise that resolves immediately when the initial auth state is settled and currentUser is available. When the promise is resolved, the current user might be a valid user or null if there is no user signed in currently.

### Patch Changes

- [`e91f82a20`](https://github.com/firebase/firebase-js-sdk/commit/e91f82a20b2c8cea75a81f55bd71d878a3d908d6) [#7467](https://github.com/firebase/firebase-js-sdk/pull/7467) (fixes [#7448](https://github.com/firebase/firebase-js-sdk/issues/7448)) - Unpin `@react-native-async-storage/async-storage` dependency to give users more control over the exact version.

## 1.0.0

### Major Changes

- [`1af178f2b`](https://github.com/firebase/firebase-js-sdk/commit/1af178f2b2207af6435db3ae6b7f3bf16b8b6183) [#7351](https://github.com/firebase/firebase-js-sdk/pull/7351) - Changed the type of ParsedToken value from any to unknown

- [`1ff891c0d`](https://github.com/firebase/firebase-js-sdk/commit/1ff891c0da15d391b62e186c14a57c59263dde65) [#7326](https://github.com/firebase/firebase-js-sdk/pull/7326) - Reorder RecaptchaVerifier parameters so auth is the first parameter

- [`c2686ed60`](https://github.com/firebase/firebase-js-sdk/commit/c2686ed60fcc524851f85de7d634fcf2891f0651) [#7138](https://github.com/firebase/firebase-js-sdk/pull/7138) - Remove `firebase/auth/react-native` entry point. The React Native bundle should be automatically picked up by React Native build tools which recognize the `react-native` fields in `package.json` (at the top level and in `exports`).

- [`f1c8d3806`](https://github.com/firebase/firebase-js-sdk/commit/f1c8d3806962a760aa0a78387e6b37140163eae6) [#7128](https://github.com/firebase/firebase-js-sdk/pull/7128) (fixes [#6493](https://github.com/firebase/firebase-js-sdk/issues/6493)) - Change `getAuth()` in the React Native bundle to default to importing `AsyncStorage` from `@react-native-async-storage/async-storage` instead of from the `react-native` core package (which has recently removed it).

## 0.23.2

### Patch Changes

- [`afdccd57a`](https://github.com/firebase/firebase-js-sdk/commit/afdccd57a93cedc3cff052dfb19c2863660ba592) [#7277](https://github.com/firebase/firebase-js-sdk/pull/7277) - Allow port numbers in authDomain

## 0.23.1

### Patch Changes

- [`1d6771eb3`](https://github.com/firebase/firebase-js-sdk/commit/1d6771eb358fd5cb9a6b53b7a0141b08f83f0b47) [#7140](https://github.com/firebase/firebase-js-sdk/pull/7140) - Increase the popup poller timeout to 8s to support blocking functions + Firefox

## 0.23.0

### Minor Changes

- [`b04f04081`](https://github.com/firebase/firebase-js-sdk/commit/b04f0408139f75c69b6f6eea396f3e961f658bd1) [#7191](https://github.com/firebase/firebase-js-sdk/pull/7191) - [feature] Added Firebase App Check support to Firebase Auth.

- [`6b8e0c13d`](https://github.com/firebase/firebase-js-sdk/commit/6b8e0c13daaf476c7e6ea034006250d1f33dd828) [#7193](https://github.com/firebase/firebase-js-sdk/pull/7193) - [feature] Add reCAPTCHA enterprise support.

## 0.22.0

### Minor Changes

- [`965396d52`](https://github.com/firebase/firebase-js-sdk/commit/965396d522243fcc17b63558823ad761c87ae1ba) [#7177](https://github.com/firebase/firebase-js-sdk/pull/7177) - Fixed error message for missing password case.

### Patch Changes

- [`bd51cecba`](https://github.com/firebase/firebase-js-sdk/commit/bd51cecba5cfc1b1c1ca46bf94e65320da3da609) [#7179](https://github.com/firebase/firebase-js-sdk/pull/7179) (fixes [#7174](https://github.com/firebase/firebase-js-sdk/issues/7174)) - Fix typings for `TotpMultiFactorGenerator`. This fixes a reversion in 9.19.0.

## 0.21.6

### Patch Changes

- [`58bae8757`](https://github.com/firebase/firebase-js-sdk/commit/58bae875799ed2ace8232f5d9e7aaaaa7a84d064) [#7146](https://github.com/firebase/firebase-js-sdk/pull/7146) - Support TOTP as a multi-factor option in Firebase Auth/GCIP.

- [`00737a1ab`](https://github.com/firebase/firebase-js-sdk/commit/00737a1abd469f3deb041d8ff482165cc16bc34e) [#7125](https://github.com/firebase/firebase-js-sdk/pull/7125) (fixes [#7118](https://github.com/firebase/firebase-js-sdk/issues/7118)) - Modify \_fail to use AuthErrorCode.NETWORK_REQUEST_FAILED

## 0.21.5

### Patch Changes

- [`e0b677e70`](https://github.com/firebase/firebase-js-sdk/commit/e0b677e70ed2fd9e488737c77ebe2fc65d3a0822) [#7066](https://github.com/firebase/firebase-js-sdk/pull/7066) - Explicitly set createdAt and lastLoginAt when cloning UserImpl

## 0.21.4

### Patch Changes

- [`c8a6e08b0`](https://github.com/firebase/firebase-js-sdk/commit/c8a6e08b01a52b3eca77ca9da8989dac2e77a972) [#7038](https://github.com/firebase/firebase-js-sdk/pull/7038) - Modify \_fail to use AuthErrorCode.INTERNAL_ERROR and pass in error message.

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.21.3

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.21.2

### Patch Changes

- [`6439f1173`](https://github.com/firebase/firebase-js-sdk/commit/6439f1173353f3857ab820675d572ea676340924) [#6973](https://github.com/firebase/firebase-js-sdk/pull/6973) - Expose TOKEN_EXPIRED error when mfa unenroll logs out the user.

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.21.1

### Patch Changes

- [`50b8191f6`](https://github.com/firebase/firebase-js-sdk/commit/50b8191f6c51a936bd92a1a6a68af1cf201fc127) [#6914](https://github.com/firebase/firebase-js-sdk/pull/6914) (fixes [#6827](https://github.com/firebase/firebase-js-sdk/issues/6827)) - Fix to minimize a potential race condition between auth init and signInWithRedirect

- Updated dependencies [[`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

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
