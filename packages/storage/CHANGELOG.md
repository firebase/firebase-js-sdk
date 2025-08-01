#Unreleased

## 0.14.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/util@1.13.0

## 0.13.14

### Patch Changes

- [`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83) [#9111](https://github.com/firebase/firebase-js-sdk/pull/9111) - Fixed issue where Storage on Firebase Studio throws CORS errors.

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 0.13.13

### Patch Changes

- [`0f891d8`](https://github.com/firebase/firebase-js-sdk/commit/0f891d861bdf4e7bac8cd777f5fb32d0b7b9bf8e) [#9059](https://github.com/firebase/firebase-js-sdk/pull/9059) - Fixed issue where Firebase Studio wasn't populating cookies for Storage users

## 0.13.12

### Patch Changes

- [`35ad526`](https://github.com/firebase/firebase-js-sdk/commit/35ad5266304e14425988fcf5ad06d028b37588ac) [#9053](https://github.com/firebase/firebase-js-sdk/pull/9053) - Revert "Fixed scroll behavior (#9043)"

- [`b5df4ae`](https://github.com/firebase/firebase-js-sdk/commit/b5df4ae71c1b5b54d9237e7929d0f793189b82c9) [#9055](https://github.com/firebase/firebase-js-sdk/pull/9055) - Updated to only show banner when calling connect\*Emulator

## 0.13.11

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 0.13.10

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 0.13.9

### Patch Changes

- [`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24) [#9031](https://github.com/firebase/firebase-js-sdk/pull/9031) - Add Emulator Overlay

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 0.13.8

### Patch Changes

- [`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875) [#8980](https://github.com/firebase/firebase-js-sdk/pull/8980) - Auto Enable SSL for Firebase Studio

- [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb) [#8968](https://github.com/firebase/firebase-js-sdk/pull/8968) - Fix Auth Redirects on Firebase Studio

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 0.13.7

### Patch Changes

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 0.13.6

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 0.13.5

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 0.13.4

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/component@0.6.11
  - @firebase/util@1.10.2

## 0.13.3

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/util@1.10.1

## 0.13.2

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 0.13.1

### Patch Changes

- [`62348e116`](https://github.com/firebase/firebase-js-sdk/commit/62348e116c795d19c5ca58729c250805240ce345) [#8432](https://github.com/firebase/firebase-js-sdk/pull/8432) (fixes [#8431](https://github.com/firebase/firebase-js-sdk/issues/8431)) - Update undici dependency to 6.19.7 due to a memory leak in older versions.

## 0.13.0

### Minor Changes

- [`6b0ca77b2`](https://github.com/firebase/firebase-js-sdk/commit/6b0ca77b28315349b39cca1ec8a63f929df07a4c) [#8410](https://github.com/firebase/firebase-js-sdk/pull/8410) (fixes [#8303](https://github.com/firebase/firebase-js-sdk/issues/8303)) - Migrate from the Node to Web ReadableStream interface

## 0.12.6

### Patch Changes

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 0.12.5

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/component@0.6.7
  - @firebase/util@1.9.6

## 0.12.4

### Patch Changes

- [`fe09d8338`](https://github.com/firebase/firebase-js-sdk/commit/fe09d8338d7d5f7a82d8cd73cf825adbe5551975) [#8138](https://github.com/firebase/firebase-js-sdk/pull/8138) (fixes [#8132](https://github.com/firebase/firebase-js-sdk/issues/8132)) - Update undici version to 5.28.4 due to CVE-2024-30260.

- [`ad8d5470d`](https://github.com/firebase/firebase-js-sdk/commit/ad8d5470dad9b9ec1bcd939609da4a1c439c8414) [#8134](https://github.com/firebase/firebase-js-sdk/pull/8134) - Updated dependencies. See GitHub PR #8098.

## 0.12.3

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/component@0.6.6
  - @firebase/util@1.9.5

## 0.12.2

### Patch Changes

- [`f3cec28df`](https://github.com/firebase/firebase-js-sdk/commit/f3cec28dfbdfc7f19c8218cf9d26956235d03fb0) [#8044](https://github.com/firebase/firebase-js-sdk/pull/8044) (fixes [#8038](https://github.com/firebase/firebase-js-sdk/issues/8038)) - Bump undici version to 5.28.3 due to security issue.

## 0.12.1

### Patch Changes

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 0.12.0

### Minor Changes

- [`bebecdaad`](https://github.com/firebase/firebase-js-sdk/commit/bebecdaad7fa552505055ab7705da478203078b6) [#7705](https://github.com/firebase/firebase-js-sdk/pull/7705) - Replaced node-fetch v2.6.7 dependency with the latest version of undici (v5.26.5) in Node.js SDK
  builds for auth, firestore, functions and storage.

## 0.11.2

### Patch Changes

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.11.1

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.11.0

### Minor Changes

- [`825e648b8`](https://github.com/firebase/firebase-js-sdk/commit/825e648b81ca63c7bc64f8700f7a46eb320b2106) [#6974](https://github.com/firebase/firebase-js-sdk/pull/6974) (fixes [#6944](https://github.com/firebase/firebase-js-sdk/issues/6944)) - Fixed issue where users were unable to check if an Error was an instance of `StorageError`.

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.10.1

### Patch Changes

- [`a67eb5d04`](https://github.com/firebase/firebase-js-sdk/commit/a67eb5d04405b8133e81aad15f3fc9441eb66091) [#6938](https://github.com/firebase/firebase-js-sdk/pull/6938) (fixes [#6935](https://github.com/firebase/firebase-js-sdk/issues/6935)) - Fixed issue where pause throws an error when a request is in flight.

- Updated dependencies [[`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 0.10.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0

## 0.9.14

### Patch Changes

- [`8876b783f`](https://github.com/firebase/firebase-js-sdk/commit/8876b783f27ba8ba0ad0305db4812432efa17461) [#6746](https://github.com/firebase/firebase-js-sdk/pull/6746) - Fixed issue where if btoa wasn't supported in the environment, then the user would get a generic message.

## 0.9.13

### Patch Changes

- [`de1c717c2`](https://github.com/firebase/firebase-js-sdk/commit/de1c717c2f69e9f21744135b74f92829927b200b) [#6705](https://github.com/firebase/firebase-js-sdk/pull/6705) - Fixed issue where clients using Node.js v18 would use the native `Blob` object which is incompatible with `node-fetch`

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/util@1.7.3

## 0.9.12

### Patch Changes

- [`5f55ed828`](https://github.com/firebase/firebase-js-sdk/commit/5f55ed828e7e7d3084590ff04d8c3e75fc718a51) [#6667](https://github.com/firebase/firebase-js-sdk/pull/6667) - Cleared retry timeouts when uploads are paused/canceled

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.9.11

### Patch Changes

- [`4eb8145fb`](https://github.com/firebase/firebase-js-sdk/commit/4eb8145fb3b503884ea610e813be359127d1a705) [#6653](https://github.com/firebase/firebase-js-sdk/pull/6653) - Fixed bug where upload status wasn't being checked after an upload failure.
  Implemented exponential backoff and max retry strategy.

* [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561) [#6673](https://github.com/firebase/firebase-js-sdk/pull/6673) - Handle IPv6 addresses in emulator autoinit.

* Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.9.10

### Patch Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.9.9

### Patch Changes

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.9.8

### Patch Changes

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.9.7

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

* [`d6338f0af`](https://github.com/firebase/firebase-js-sdk/commit/d6338f0af0f9914d2cd9a16435a9e2ef267d2f4c) [#6345](https://github.com/firebase/firebase-js-sdk/pull/6345) (fixes [#6343](https://github.com/firebase/firebase-js-sdk/issues/6343)) - Fixed Node ESM bundle to build from Node entry point. (It was incorrectly using the browser entry point.)

* Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/util@1.6.1

## 0.9.6

### Patch Changes

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.9.5

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.9.4

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.9.3

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.9.2

### Patch Changes

- [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

## 0.9.1

### Patch Changes

- [`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49) [#5831](https://github.com/firebase/firebase-js-sdk/pull/5831) (fixes [#5754](https://github.com/firebase/firebase-js-sdk/issues/5754)) - FirestoreError and StorageError now extend FirebaseError

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.9.0

### Minor Changes

- [`e34e98e73`](https://github.com/firebase/firebase-js-sdk/commit/e34e98e73a72f77ee87d9005d6728402129deda9) [#5672](https://github.com/firebase/firebase-js-sdk/pull/5672) (fixes [#76](https://github.com/firebase/firebase-js-sdk/issues/76)) - Adds `getBytes()`, `getStream()` and `getBlob()`, which allow direct file downloads from the SDK.

### Patch Changes

- [`0394cc97b`](https://github.com/firebase/firebase-js-sdk/commit/0394cc97b98f04dae87b718655eb46174275ebc2) [#5743](https://github.com/firebase/firebase-js-sdk/pull/5743) - Fix typings for storage and storage-compat.

## 0.8.7

### Patch Changes

- [`e0fe2b668`](https://github.com/firebase/firebase-js-sdk/commit/e0fe2b668b64b64d842988c2c147d3de66148f48) [#5703](https://github.com/firebase/firebase-js-sdk/pull/5703) (fixes [#5628](https://github.com/firebase/firebase-js-sdk/issues/5628)) - Clear the global timeout once an operation is done in the Storage SDK. Otherwise it may prevent Node.js from exiting.

## 0.8.6

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/util@1.4.2

## 0.8.5

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/util@1.4.1

## 0.8.4

### Patch Changes

- [`a7e00b9eb`](https://github.com/firebase/firebase-js-sdk/commit/a7e00b9ebbb05b094a8bf620790146e750463c12) [#5578](https://github.com/firebase/firebase-js-sdk/pull/5578) (fixes [#5372](https://github.com/firebase/firebase-js-sdk/issues/5372)) - Do not throw from `connection.send` to enable retries in Node.js.

* [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 0.8.3

### Patch Changes

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.8.2

### Patch Changes

- [`66d4a1e5d`](https://github.com/firebase/firebase-js-sdk/commit/66d4a1e5d8e1b8b952e21fc3190ec7076d8161ea) [#5453](https://github.com/firebase/firebase-js-sdk/pull/5453) - Store protocol and host separately on Storage service instance. Fixes a bug when generating url strings.

## 0.8.1

### Patch Changes

- [`6163bb282`](https://github.com/firebase/firebase-js-sdk/commit/6163bb282b4e3b6fe5f405c3b3e35d5691d41677) [#5399](https://github.com/firebase/firebase-js-sdk/pull/5399) - Addressed incorrect use of the `node-fetch` polyfill

## 0.8.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.7.0

### Minor Changes

- [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131) [#5282](https://github.com/firebase/firebase-js-sdk/pull/5282) - Implement mockUserToken for Storage and fix JWT format bugs.

### Patch Changes

- [`fbb32e7bf`](https://github.com/firebase/firebase-js-sdk/commit/fbb32e7bff32942bea16385fc387b8c22952ed4d) [#5315](https://github.com/firebase/firebase-js-sdk/pull/5315) (fixes [#5180](https://github.com/firebase/firebase-js-sdk/issues/5180)) - Change `ref()` to not throw if given a path with '..' in it.

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/storage-types@0.5.0
  - @firebase/util@1.3.0

## 0.6.2

### Patch Changes

- [`5bda08eee`](https://github.com/firebase/firebase-js-sdk/commit/5bda08eee4e0c4007b1d858edcbcc8020604d560) [#5245](https://github.com/firebase/firebase-js-sdk/pull/5245) - Adds a browser CJS build as ./dist/index.browser.cjs.js.

## 0.6.1

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5

## 0.6.0

### Minor Changes

- [`b3caa5158`](https://github.com/firebase/firebase-js-sdk/commit/b3caa515846d2bfcf4a95dedff69f08d503cbfc2) [#5149](https://github.com/firebase/firebase-js-sdk/pull/5149) - Add NodeJS support to Cloud Storage for Firebase. This release changes the `main` field in package.json to point to a Node specific build. If you are building a bundle for browser usage, please make sure that your bundler uses the `browser` field (the default).

## 0.5.6

### Patch Changes

- Updated dependencies [[`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/component@0.5.4

## 0.5.5

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 0.5.4

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 0.5.3

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 0.5.2

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/util@1.1.0

## 0.5.1

### Patch Changes

- [`364e336a0`](https://github.com/firebase/firebase-js-sdk/commit/364e336a04e419d019846d702cf27144aeb8939e) [#4807](https://github.com/firebase/firebase-js-sdk/pull/4807) - Fix infinite recursion caused by `FirebaseStorageError` message getter.

- Updated dependencies [[`3f370215a`](https://github.com/firebase/firebase-js-sdk/commit/3f370215aa571db6b41b92a7d8a9aaad2ea0ecd0)]:
  - @firebase/storage-types@0.4.1

## 0.5.0

### Minor Changes

- [`5ae73656d`](https://github.com/firebase/firebase-js-sdk/commit/5ae73656d976fa724ea6ca86d496e9531c95b29c) [#4346](https://github.com/firebase/firebase-js-sdk/pull/4346) - Add `storage().useEmulator()` method to enable emulator mode for storage, allowing users
  to set a storage emulator host and port.

### Patch Changes

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda), [`5ae73656d`](https://github.com/firebase/firebase-js-sdk/commit/5ae73656d976fa724ea6ca86d496e9531c95b29c)]:
  - @firebase/util@1.0.0
  - @firebase/storage-types@0.4.0
  - @firebase/component@0.4.1

## 0.4.7

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0

## 0.4.6

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - @firebase/component@0.3.1

## 0.4.5

### Patch Changes

- [`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3) [#4595](https://github.com/firebase/firebase-js-sdk/pull/4595) - Component factory now takes an options object. And added `Provider.initialize()` that can be used to pass an options object to the component factory.

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0

## 0.4.4

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e)]:
  - @firebase/util@0.4.0
  - @firebase/component@0.2.1

## 0.4.3

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 0.4.2

### Patch Changes

- [`f9dc50e35`](https://github.com/firebase/firebase-js-sdk/commit/f9dc50e3520d50b70eecd28b81887e0053f9f636) [#3499](https://github.com/firebase/firebase-js-sdk/pull/3499) - Refactored Storage to allow for modularization.

## 0.4.1

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 0.4.0

### Minor Changes

- [`b247ffa76`](https://github.com/firebase/firebase-js-sdk/commit/b247ffa760aec1636de6cfc78851f97a840181ae) [#3967](https://github.com/firebase/firebase-js-sdk/pull/3967) - This releases removes all input validation. Please use our TypeScript types to validate API usage.

### Patch Changes

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce)]:
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3

## 0.3.43

### Patch Changes

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 0.3.42

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 0.3.41

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 0.3.40

### Patch Changes

- [`ee33ebf7`](https://github.com/firebase/firebase-js-sdk/commit/ee33ebf726b1dc31ab4817e7a1923f7b2757e17c) [#3414](https://github.com/firebase/firebase-js-sdk/pull/3414) - Error messages for backend errors now include the backend's response message.

## 0.3.39

### Patch Changes

- [`9c409ea7`](https://github.com/firebase/firebase-js-sdk/commit/9c409ea74efd00fe17058c5c8b74450fae67e9ee) [#3224](https://github.com/firebase/firebase-js-sdk/pull/3224) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fix] Updated the TypeScript types for all APIs using Observers to allow callback omission.

- Updated dependencies [[`9c409ea7`](https://github.com/firebase/firebase-js-sdk/commit/9c409ea74efd00fe17058c5c8b74450fae67e9ee)]:
  - @firebase/storage-types@0.3.13

## 0.3.38

### Patch Changes

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
- [Changed] Added an additional header to all network requests that propagates the Firebase App ID.

# 6.1.0

- [Feature] Added the support for List API.
