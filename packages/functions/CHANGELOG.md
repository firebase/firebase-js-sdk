# @firebase/functions

## 0.13.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/util@1.13.0

## 0.12.9

### Patch Changes

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 0.12.8

### Patch Changes

- [`35ad526`](https://github.com/firebase/firebase-js-sdk/commit/35ad5266304e14425988fcf5ad06d028b37588ac) [#9053](https://github.com/firebase/firebase-js-sdk/pull/9053) - Revert "Fixed scroll behavior (#9043)"

- [`b5df4ae`](https://github.com/firebase/firebase-js-sdk/commit/b5df4ae71c1b5b54d9237e7929d0f793189b82c9) [#9055](https://github.com/firebase/firebase-js-sdk/pull/9055) - Updated to only show banner when calling connect\*Emulator

## 0.12.7

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 0.12.6

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 0.12.5

### Patch Changes

- [`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24) [#9031](https://github.com/firebase/firebase-js-sdk/pull/9031) - Add Emulator Overlay

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 0.12.4

### Patch Changes

- [`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875) [#8980](https://github.com/firebase/firebase-js-sdk/pull/8980) - Auto Enable SSL for Firebase Studio

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 0.12.3

### Patch Changes

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 0.12.2

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 0.12.1

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 0.12.0

### Minor Changes

- [`f05509e8c`](https://github.com/firebase/firebase-js-sdk/commit/f05509e8c526ce44656389ab9997a6e5ee957a3d) [#8609](https://github.com/firebase/firebase-js-sdk/pull/8609) - Add `.stream()` api for callable functions for consuming streaming responses.

## 0.11.10

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/app-check-interop-types@0.3.3
  - @firebase/auth-interop-types@0.2.4
  - @firebase/component@0.6.11
  - @firebase/messaging-interop-types@0.2.3
  - @firebase/util@1.10.2

## 0.11.9

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove node bundle from the functions SDK as the node-specific fetch code has been removed in favor of using native fetch throughout the SDK.

- [`a2146910c`](https://github.com/firebase/firebase-js-sdk/commit/a2146910ccb0efd1e0dc4496c328358d5afdea61) [#8546](https://github.com/firebase/firebase-js-sdk/pull/8546) (fixes [#8511](https://github.com/firebase/firebase-js-sdk/issues/8511)) - Make the `FunctionsError` class publicly exported.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/util@1.10.1

## 0.11.8

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 0.11.7

### Patch Changes

- [`2ee2a90ae`](https://github.com/firebase/firebase-js-sdk/commit/2ee2a90aebcf75a0df467c47a5f731b07ce69070) [#8441](https://github.com/firebase/firebase-js-sdk/pull/8441) (fixes [#8440](https://github.com/firebase/firebase-js-sdk/issues/8440)) - Allow a custom path in Firebase functions custom domain

- [`62348e116`](https://github.com/firebase/firebase-js-sdk/commit/62348e116c795d19c5ca58729c250805240ce345) [#8432](https://github.com/firebase/firebase-js-sdk/pull/8432) (fixes [#8431](https://github.com/firebase/firebase-js-sdk/issues/8431)) - Update undici dependency to 6.19.7 due to a memory leak in older versions.

## 0.11.6

### Patch Changes

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 0.11.5

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/app-check-interop-types@0.3.2
  - @firebase/auth-interop-types@0.2.3
  - @firebase/component@0.6.7
  - @firebase/messaging-interop-types@0.2.2
  - @firebase/util@1.9.6

## 0.11.4

### Patch Changes

- [`fe09d8338`](https://github.com/firebase/firebase-js-sdk/commit/fe09d8338d7d5f7a82d8cd73cf825adbe5551975) [#8138](https://github.com/firebase/firebase-js-sdk/pull/8138) (fixes [#8132](https://github.com/firebase/firebase-js-sdk/issues/8132)) - Update undici version to 5.28.4 due to CVE-2024-30260.

## 0.11.3

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/app-check-interop-types@0.3.1
  - @firebase/messaging-interop-types@0.2.1
  - @firebase/auth-interop-types@0.2.2
  - @firebase/component@0.6.6
  - @firebase/util@1.9.5

## 0.11.2

### Patch Changes

- [`f3cec28df`](https://github.com/firebase/firebase-js-sdk/commit/f3cec28dfbdfc7f19c8218cf9d26956235d03fb0) [#8044](https://github.com/firebase/firebase-js-sdk/pull/8044) (fixes [#8038](https://github.com/firebase/firebase-js-sdk/issues/8038)) - Bump undici version to 5.28.3 due to security issue.

## 0.11.1

### Patch Changes

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 0.11.0

### Minor Changes

- [`bebecdaad`](https://github.com/firebase/firebase-js-sdk/commit/bebecdaad7fa552505055ab7705da478203078b6) [#7705](https://github.com/firebase/firebase-js-sdk/pull/7705) - Replaced node-fetch v2.6.7 dependency with the latest version of undici (v5.26.5) in Node.js SDK
  builds for auth, firestore, functions and storage.

## 0.10.0

### Minor Changes

- [`e12e7f535`](https://github.com/firebase/firebase-js-sdk/commit/e12e7f53516b77f73e3781ffb64385d52982f653) [#7296](https://github.com/firebase/firebase-js-sdk/pull/7296) - Add support for App Check replay protection in callable functions

### Patch Changes

- Updated dependencies [[`e12e7f535`](https://github.com/firebase/firebase-js-sdk/commit/e12e7f53516b77f73e3781ffb64385d52982f653)]:
  - @firebase/app-check-interop-types@0.3.0

## 0.9.4

### Patch Changes

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.9.3

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.9.2

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`e9bcd4c43`](https://github.com/firebase/firebase-js-sdk/commit/e9bcd4c43a0628ebce570f03f1e91dfa93fffca2), [`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/auth-interop-types@0.2.1
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 0.9.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/app-check-interop-types@0.2.0
  - @firebase/auth-interop-types@0.2.0
  - @firebase/component@0.6.0
  - @firebase/messaging-interop-types@0.2.0

## 0.8.8

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/app-check-interop-types@0.1.1
  - @firebase/auth-interop-types@0.1.7
  - @firebase/component@0.5.21
  - @firebase/messaging-interop-types@0.1.1
  - @firebase/util@1.7.3

## 0.8.7

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.8.6

### Patch Changes

- [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561) [#6673](https://github.com/firebase/firebase-js-sdk/pull/6673) - Handle IPv6 addresses in emulator autoinit.

- Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.8.5

### Patch Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.8.4

### Patch Changes

- [`e673dc808`](https://github.com/firebase/firebase-js-sdk/commit/e673dc808adc14baa499c4ecc31fdb82b1ff0757) [#6344](https://github.com/firebase/firebase-js-sdk/pull/6344) (fixes [#6281](https://github.com/firebase/firebase-js-sdk/issues/6281)) - Update public `FunctionsErrorCode` type to include "functions/" prefix.

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.8.3

### Patch Changes

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.8.2

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

- Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/util@1.6.1

## 0.8.1

### Patch Changes

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.8.0

### Minor Changes

- [`c69c6898a`](https://github.com/firebase/firebase-js-sdk/commit/c69c6898a3d14ddcc6c6cafd3a219064b500c4f6) [#6162](https://github.com/firebase/firebase-js-sdk/pull/6162) - Add `httpsCallableFromURL()`, which calls a callable function using its url.

## 0.7.11

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.7.10

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.7.9

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.7.8

### Patch Changes

- [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

## 0.7.7

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.7.6

### Patch Changes

- [`3b338dbd8`](https://github.com/firebase/firebase-js-sdk/commit/3b338dbd8cdfdc73267cd052b1852a1358b05eaf) [#5701](https://github.com/firebase/firebase-js-sdk/pull/5701) (fixes [#5692](https://github.com/firebase/firebase-js-sdk/issues/5692)) - Clear pending timeout after promise.race. It allows the process to exit immediately in case the SDK is used in Node.js, otherwise the process will wait for the timeout to finish before exiting.

## 0.7.5

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/util@1.4.2

## 0.7.4

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/util@1.4.1

## 0.7.3

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 0.7.2

### Patch Changes

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.7.1

### Patch Changes

- [`deda8cd85`](https://github.com/firebase/firebase-js-sdk/commit/deda8cd85e365c36b657dbe8a233b16bcf751ea7) [#5459](https://github.com/firebase/firebase-js-sdk/pull/5459) - Do not send App Check dummy token to functions endpoint.

## 0.7.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - @firebase/messaging-interop-types@0.1.0

## 0.6.15

### Patch Changes

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec)]:
  - @firebase/component@0.5.6

## 0.6.14

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.5.5

## 0.6.13

### Patch Changes

- Updated dependencies [[`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/component@0.5.4

## 0.6.12

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 0.6.11

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 0.6.10

### Patch Changes

- [`92e4e8d29`](https://github.com/firebase/firebase-js-sdk/commit/92e4e8d2996c690837a203a868b0d26bf6e3ad84) [#4887](https://github.com/firebase/firebase-js-sdk/pull/4887) (fixes [#683](https://github.com/firebase/firebase-js-sdk/issues/683)) - Fix functions to convert Date objects to an ISO string instead of an empty object.

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 0.6.9

### Patch Changes

- [`997040ace`](https://github.com/firebase/firebase-js-sdk/commit/997040ace70de0891c9dea78b6da89e4886163b9) [#4924](https://github.com/firebase/firebase-js-sdk/pull/4924) - Fixed a bug in `httpsCallable()` when used in the same project as Firebase Messaging.

## 0.6.8

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae)]:
  - @firebase/component@0.5.0

## 0.6.7

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.4.1

## 0.6.6

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0

## 0.6.5

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.3.1

## 0.6.4

### Patch Changes

- [`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3) [#4595](https://github.com/firebase/firebase-js-sdk/pull/4595) - Component factory now takes an options object. And added `Provider.initialize()` that can be used to pass an options object to the component factory.

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0

## 0.6.3

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.2.1

## 0.6.2

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 0.6.1

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.1.21

## 0.6.0

### Minor Changes

- [`0322c1bda`](https://github.com/firebase/firebase-js-sdk/commit/0322c1bda93b2885b995e3df2b63b48314546961) [#3906](https://github.com/firebase/firebase-js-sdk/pull/3906) - Add a useEmulator(host, port) method to Cloud Functions

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

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`0322c1bda`](https://github.com/firebase/firebase-js-sdk/commit/0322c1bda93b2885b995e3df2b63b48314546961)]:
  - @firebase/component@0.1.20
  - @firebase/functions-types@0.4.0

## 0.5.1

### Patch Changes

- [`b6b1fd95c`](https://github.com/firebase/firebase-js-sdk/commit/b6b1fd95cbeeabc38daa574ce7cf0b7dd34cf550) - Fixes a bug introduced in #3782 that causes callable functions to throw an error in browser extensions.

## 0.5.0

### Minor Changes

- [`a6af7c279`](https://github.com/firebase/firebase-js-sdk/commit/a6af7c27925da47fa62ee3b7b0a267a272c52220) [#3825](https://github.com/firebase/firebase-js-sdk/pull/3825) - Allow setting a custom domain for callable Cloud Functions.

## 0.4.51

### Patch Changes

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca)]:
  - @firebase/component@0.1.19

## 0.4.50

### Patch Changes

- Updated dependencies [[`29327b21`](https://github.com/firebase/firebase-js-sdk/commit/29327b2198391a9f1e545bcd1172a4b3e12a522c)]:
  - @firebase/messaging-types@0.5.0
  - @firebase/component@0.1.18

## 0.4.49

### Patch Changes

- Updated dependencies []:
  - @firebase/component@0.1.17

## 0.4.48

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

* [`bb740836`](https://github.com/firebase/firebase-js-sdk/commit/bb7408361519aa9a58c8256ae01914cf2830e118) [#3330](https://github.com/firebase/firebase-js-sdk/pull/3330) Thanks [@Feiyang1](https://github.com/Feiyang1)! - Clear timeout after a successful response or after the request is canceled. Fixes [issue 3289](https://github.com/firebase/firebase-js-sdk/issues/3289).

* Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
