# Unreleased

## 1.1.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 1.0.20

### Patch Changes

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 1.0.19

### Patch Changes

- [`35ad526`](https://github.com/firebase/firebase-js-sdk/commit/35ad5266304e14425988fcf5ad06d028b37588ac) [#9053](https://github.com/firebase/firebase-js-sdk/pull/9053) - Revert "Fixed scroll behavior (#9043)"

- [`b5df4ae`](https://github.com/firebase/firebase-js-sdk/commit/b5df4ae71c1b5b54d9237e7929d0f793189b82c9) [#9055](https://github.com/firebase/firebase-js-sdk/pull/9055) - Updated to only show banner when calling connect\*Emulator

## 1.0.18

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 1.0.17

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 1.0.16

### Patch Changes

- [`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24) [#9031](https://github.com/firebase/firebase-js-sdk/pull/9031) - Add Emulator Overlay

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 1.0.15

### Patch Changes

- [`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875) [#8980](https://github.com/firebase/firebase-js-sdk/pull/8980) - Auto Enable SSL for Firebase Studio

- [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb) [#8968](https://github.com/firebase/firebase-js-sdk/pull/8968) - Fix Auth Redirects on Firebase Studio

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 1.0.14

### Patch Changes

- [`113c965`](https://github.com/firebase/firebase-js-sdk/commit/113c965a34d9d7219d236f1b2cb62029e0f80fda) [#8800](https://github.com/firebase/firebase-js-sdk/pull/8800) - Added non-null parent properties to ThenableReference

## 1.0.13

### Patch Changes

- [`b3e68ca`](https://github.com/firebase/firebase-js-sdk/commit/b3e68ca410d9b984736780098330bd6b8ee2e997) [#8769](https://github.com/firebase/firebase-js-sdk/pull/8769) - Fixed: invoking `connectDatabaseEmulator` multiple times with the same parameters will no longer
  cause an error. Fixes [GitHub Issue #6824](https://github.com/firebase/firebase-js-sdk/issues/6824).
- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 1.0.12

### Patch Changes

- [`01f36ea`](https://github.com/firebase/firebase-js-sdk/commit/01f36ea41011fdd6ec77e4b1a799193bef58aa91) [#8719](https://github.com/firebase/firebase-js-sdk/pull/8719) - Fix a potential for a negative offset when calculating last reconnect times. This could cause lengthy reconnect delays in some scenarios. Fixes #8718.

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 1.0.11

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 1.0.10

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/app-check-interop-types@0.3.3
  - @firebase/auth-interop-types@0.2.4
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 1.0.9

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 1.0.8

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 1.0.7

### Patch Changes

- [`025f2a103`](https://github.com/firebase/firebase-js-sdk/commit/025f2a1037582da7d1afeb7a4d143cb7a154ec9d) [#8280](https://github.com/firebase/firebase-js-sdk/pull/8280) (fixes [#8279](https://github.com/firebase/firebase-js-sdk/issues/8279)) - Fixed typos in documentation and some internal variables and parameters.

## 1.0.6

### Patch Changes

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 1.0.5

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/app-check-interop-types@0.3.2
  - @firebase/auth-interop-types@0.2.3
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6

## 1.0.4

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/app-check-interop-types@0.3.1
  - @firebase/auth-interop-types@0.2.2
  - @firebase/component@0.6.6
  - @firebase/logger@0.4.1
  - @firebase/util@1.9.5

## 1.0.3

### Patch Changes

- [`046ac8a39`](https://github.com/firebase/firebase-js-sdk/commit/046ac8a39b483e127a4bbe11a5390a3e6018f2a7) [#7973](https://github.com/firebase/firebase-js-sdk/pull/7973) (fixes [#7835](https://github.com/firebase/firebase-js-sdk/issues/7835)) - Fixed issue where queryConstraint.type was undefined

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 1.0.2

### Patch Changes

- [`0ecaf6c9f`](https://github.com/firebase/firebase-js-sdk/commit/0ecaf6c9fa14b40d32c52215d9e1c912bcc52bef) [#7827](https://github.com/firebase/firebase-js-sdk/pull/7827) - Add `@firebase/app-check-interop-types` dependency to `database` package

## 1.0.1

### Patch Changes

- [`82d7df439`](https://github.com/firebase/firebase-js-sdk/commit/82d7df4395d6bd5f569bfc4b3f8f394b0274f905) [#7258](https://github.com/firebase/firebase-js-sdk/pull/7258) - Included `initStandalone` as an internal method to RTDB.

## 1.0.0

### Major Changes

- [`4f904bf41`](https://github.com/firebase/firebase-js-sdk/commit/4f904bf41c2080dc51278f732e08ab95e28c1956) [#6541](https://github.com/firebase/firebase-js-sdk/pull/6541) - Updated type of action parameter for DataSnapshot#forEach

## 0.14.4

### Patch Changes

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.14.3

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.14.2

### Patch Changes

- [`49ee786f2`](https://github.com/firebase/firebase-js-sdk/commit/49ee786f2b022e65aef45693e1a8b546d889ec10) [#6912](https://github.com/firebase/firebase-js-sdk/pull/6912) (fixes [#4603](https://github.com/firebase/firebase-js-sdk/issues/4603)) - Fixed issue where hostname set by `connectDatabaseEmulator` was being overridden by longpolling response

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.14.1

### Patch Changes

- [`d8af08feb`](https://github.com/firebase/firebase-js-sdk/commit/d8af08febfd4507a28bcda38d475b8010ef20f92) [#6883](https://github.com/firebase/firebase-js-sdk/pull/6883) (fixes [#6853](https://github.com/firebase/firebase-js-sdk/issues/6853)) - Fixed issue where connectDatabaseToEmulator can be called twice during a hot reload

- [`a4056634a`](https://github.com/firebase/firebase-js-sdk/commit/a4056634a5119dd3f2ca935cae23b90fc99d84ee) [#6916](https://github.com/firebase/firebase-js-sdk/pull/6916) - Replace `innerHTML` call with `textContent`.

- Updated dependencies [[`e9bcd4c43`](https://github.com/firebase/firebase-js-sdk/commit/e9bcd4c43a0628ebce570f03f1e91dfa93fffca2), [`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/auth-interop-types@0.2.1
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 0.14.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- [`37dd6f6f4`](https://github.com/firebase/firebase-js-sdk/commit/37dd6f6f471d9912db3800b9b377080752af8c10) [#6706](https://github.com/firebase/firebase-js-sdk/pull/6706) - Use new wire protocol parameters for startAfter, endBefore.

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/auth-interop-types@0.2.0
  - @firebase/component@0.6.0
  - @firebase/logger@0.4.0

## 0.13.10

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/auth-interop-types@0.1.7
  - @firebase/component@0.5.21
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3

## 0.13.9

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.13.8

### Patch Changes

- [`5aa48d0ab`](https://github.com/firebase/firebase-js-sdk/commit/5aa48d0ab432002ccf49d65bf2ff637e82a2b402) [#6583](https://github.com/firebase/firebase-js-sdk/pull/6583) - Fixed `endBefore` and `push` documentation typos in RTDB

* [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561) [#6673](https://github.com/firebase/firebase-js-sdk/pull/6673) - Handle IPv6 addresses in emulator autoinit.

* Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.13.7

### Patch Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.13.6

### Patch Changes

- [`f35533594`](https://github.com/firebase/firebase-js-sdk/commit/f355335942b874ba390bcbf3be6de44a3d33dce8) [#6560](https://github.com/firebase/firebase-js-sdk/pull/6560) - Included experimental support for Deno

## 0.13.5

### Patch Changes

- [`9f1e3c667`](https://github.com/firebase/firebase-js-sdk/commit/9f1e3c66747126c8e24894d73f7fa27480bec08d) [#6536](https://github.com/firebase/firebase-js-sdk/pull/6536) - Revert "Updated type of action parameter for DataSnapshot#forEach"

* [`a5d9e1083`](https://github.com/firebase/firebase-js-sdk/commit/a5d9e10831c2877e9d15c8a33b15557e4251c4de) [#6497](https://github.com/firebase/firebase-js-sdk/pull/6497) - Fix issue with how get results for filtered queries are added to cache.
  Fix issue with events not getting propagated to listeners by get.

- [`fcd4b8ac3`](https://github.com/firebase/firebase-js-sdk/commit/fcd4b8ac36636a60d83cd3370969ff9192f9e6ad) [#6508](https://github.com/firebase/firebase-js-sdk/pull/6508) - Fixed faulty transaction bug causing filtered index queries to override default queries.

## 0.13.4

### Patch Changes

- [`65838089d`](https://github.com/firebase/firebase-js-sdk/commit/65838089da47965e5e39e58c76a81a74666b215e) [#6374](https://github.com/firebase/firebase-js-sdk/pull/6374) (fixes [#6368](https://github.com/firebase/firebase-js-sdk/issues/6368)) - Updated type of action parameter for DataSnapshot#forEach

## 0.13.3

### Patch Changes

- [`c187446a2`](https://github.com/firebase/firebase-js-sdk/commit/c187446a202d881f55800be167cdb37b4d0e4a13) [#6410](https://github.com/firebase/firebase-js-sdk/pull/6410) - Removed uuid as a dependency for @firebase/database

* [`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf) [#6340](https://github.com/firebase/firebase-js-sdk/pull/6340) (fixes [#6036](https://github.com/firebase/firebase-js-sdk/issues/6036)) - Forced `get()` to wait until db is online to resolve.

- [`6a8be1337`](https://github.com/firebase/firebase-js-sdk/commit/6a8be1337f19a49db40e0c757f571f42b5b4d494) [#6399](https://github.com/firebase/firebase-js-sdk/pull/6399) - Fix setting of headers on Node.

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.13.2

### Patch Changes

- [`578dc5836`](https://github.com/firebase/firebase-js-sdk/commit/578dc58365c6c71d8ad01dd8b9dbe829e76de068) [#6273](https://github.com/firebase/firebase-js-sdk/pull/6273) - Fixed issue where `get()` saved results incorrectly for non-default queries.

* [`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0) [#6363](https://github.com/firebase/firebase-js-sdk/pull/6363) - Extract uuid function into @firebase/util

* Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.13.1

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

- Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1

## 0.13.0

### Minor Changes

- [`9c6808fea`](https://github.com/firebase/firebase-js-sdk/commit/9c6808fea231d1ab6de6f6ab548c67b751a12a78) [#6171](https://github.com/firebase/firebase-js-sdk/pull/6171) - Add `forceWebSockets()` and `forceLongPolling()`

### Patch Changes

- [`874cdbbcc`](https://github.com/firebase/firebase-js-sdk/commit/874cdbbccbc2bf8f4ee18abe220e87dc52e6a8db) [#6232](https://github.com/firebase/firebase-js-sdk/pull/6232) - Added GMPID to websocket connection.

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.12.8

### Patch Changes

- [`7a4e65cef`](https://github.com/firebase/firebase-js-sdk/commit/7a4e65cef9468a20fb32dc112aa7113345bc76c5) [#6126](https://github.com/firebase/firebase-js-sdk/pull/6126) - Fix issue where if a websocket protocol was used in the databaseURL, `webSocketOnly` field was incorrectly set to undefined. (When using `wss` or `ws` protocols in the databaseURL, webSocketOnly will be true and longPolling will be disabled)

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.12.7

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.12.6

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.12.5

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.12.4

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2

## 0.12.3

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1

## 0.12.2

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 0.12.1

### Patch Changes

- [`dfe65ff9b`](https://github.com/firebase/firebase-js-sdk/commit/dfe65ff9bfa66d318d45e2a666e302867ae53a01) [#5537](https://github.com/firebase/firebase-js-sdk/pull/5537) - Added an entry point `@firebase/database-compat/standalone` to share code with Admin SDK properly

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.12.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.11.0

### Minor Changes

- [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131) [#5282](https://github.com/firebase/firebase-js-sdk/pull/5282) - Implement mockUserToken for Storage and fix JWT format bugs.

### Patch Changes

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/database-types@0.8.0
  - @firebase/util@1.3.0

## 0.10.9

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5
  - @firebase/database-types@0.7.3

## 0.10.8

### Patch Changes

- [`fb3e35965`](https://github.com/firebase/firebase-js-sdk/commit/fb3e35965b23f88e318dd877fabade16cdcb6385) [#5146](https://github.com/firebase/firebase-js-sdk/pull/5146) - Fix sending of auth tokens on node.

## 0.10.7

### Patch Changes

- [`99414a51c`](https://github.com/firebase/firebase-js-sdk/commit/99414a51ca5cd25f69a96e4c9949ad5b84e3f64e) [#5082](https://github.com/firebase/firebase-js-sdk/pull/5082) - On Node, always send Auth and AppCheck tokens when they are available.

## 0.10.6

### Patch Changes

- Updated dependencies [[`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/component@0.5.4

## 0.10.5

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 0.10.4

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 0.10.3

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 0.10.2

### Patch Changes

- [`2a5039ee3`](https://github.com/firebase/firebase-js-sdk/commit/2a5039ee3242fb4109da9dee36ac978d78519334) [#4796](https://github.com/firebase/firebase-js-sdk/pull/4796) - Fix `index not defined` errors for orderByChild get requests

## 0.10.1

### Patch Changes

- [`5b202f852`](https://github.com/firebase/firebase-js-sdk/commit/5b202f852ca68b35b06b0ea17e4b6b8c446c651c) [#4864](https://github.com/firebase/firebase-js-sdk/pull/4864) - Fixed an issue that could cause `once()` to fire more than once if the value was modified inside its callback.

## 0.10.0

### Minor Changes

- [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467) [#4792](https://github.com/firebase/firebase-js-sdk/pull/4792) - Add mockUserToken support for database emulator.

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/util@1.1.0

## 0.9.12

### Patch Changes

- [`8d63eacf9`](https://github.com/firebase/firebase-js-sdk/commit/8d63eacf964c6e6b3b8ffe06bf682844ee430fbc) [#4832](https://github.com/firebase/firebase-js-sdk/pull/4832) (fixes [#4818](https://github.com/firebase/firebase-js-sdk/issues/4818)) - Fixes an issue that prevented the SDK from firing cancel events for Rules violations.

* [`d422436d1`](https://github.com/firebase/firebase-js-sdk/commit/d422436d1d83f82aee8028e3a24c8e18d9d7c098) [#4828](https://github.com/firebase/firebase-js-sdk/pull/4828) (fixes [#4811](https://github.com/firebase/firebase-js-sdk/issues/4811)) - Fixes a regression introduced with 8.4.1 that broke `useEmulator()`.

## 0.9.11

### Patch Changes

- [`191184eb4`](https://github.com/firebase/firebase-js-sdk/commit/191184eb454109bff9198274fc416664b126d7ec) [#4801](https://github.com/firebase/firebase-js-sdk/pull/4801) - Fixes an internal conflict when using v8 and v9 SDKs in the same package.

- Updated dependencies [[`3f370215a`](https://github.com/firebase/firebase-js-sdk/commit/3f370215aa571db6b41b92a7d8a9aaad2ea0ecd0)]:
  - @firebase/auth-interop-types@0.1.6

## 0.9.10

### Patch Changes

- [`74fa5064a`](https://github.com/firebase/firebase-js-sdk/commit/74fa5064ae6a183b229975dc858c5ee0f567d0d4) [#4777](https://github.com/firebase/firebase-js-sdk/pull/4777) - Fix a build issue that caused SDK breakage.

## 0.9.9

### Patch Changes

- [`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda) [#4720](https://github.com/firebase/firebase-js-sdk/pull/4720) - Internal changes to Database and Validation APIs.

- Updated dependencies [[`e46ebb743`](https://github.com/firebase/firebase-js-sdk/commit/e46ebb743f670f3b7d2160164addeddf918fb0cb), [`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda)]:
  - @firebase/database-types@0.7.2
  - @firebase/util@1.0.0
  - @firebase/component@0.4.1

## 0.9.8

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0
  - @firebase/database-types@0.7.1

## 0.9.7

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - @firebase/component@0.3.1

## 0.9.6

### Patch Changes

- [`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3) [#4595](https://github.com/firebase/firebase-js-sdk/pull/4595) - Component factory now takes an options object. And added `Provider.initialize()` that can be used to pass an options object to the component factory.

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0

## 0.9.5

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e)]:
  - @firebase/util@0.4.0
  - @firebase/component@0.2.1

## 0.9.4

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 0.9.3

### Patch Changes

- [`318af5471`](https://github.com/firebase/firebase-js-sdk/commit/318af54715dc61a09897b144dd8841fec1abd8a3) [#4408](https://github.com/firebase/firebase-js-sdk/pull/4408) - Fixed an issue with `Query.get()` where Query filters are not applied to data in some cases.

* [`05614aa86`](https://github.com/firebase/firebase-js-sdk/commit/05614aa86614994b69df154bd6ce34861fae37a5) [#4427](https://github.com/firebase/firebase-js-sdk/pull/4427) - Add `startAfter()` and `endBefore()` to the Realtime Database TypeScript definitions.

* Updated dependencies [[`05614aa86`](https://github.com/firebase/firebase-js-sdk/commit/05614aa86614994b69df154bd6ce34861fae37a5)]:
  - @firebase/database-types@0.7.0

## 0.9.2

### Patch Changes

- [`0af2bdfc6`](https://github.com/firebase/firebase-js-sdk/commit/0af2bdfc6b8be3f362cd630e2a917c5a070c568e) [#4363](https://github.com/firebase/firebase-js-sdk/pull/4363) - Fixed an issue with startAfter/endBefore when used in orderByKey queries

## 0.9.1

### Patch Changes

- [`04a0fea9e`](https://github.com/firebase/firebase-js-sdk/commit/04a0fea9ef291a7da244665289a1aed32e4e7a3b) [#4299](https://github.com/firebase/firebase-js-sdk/pull/4299) - get()s issued for queries that are being listened to no longer send backend requests.

## 0.9.0

### Minor Changes

- [`cb835e723`](https://github.com/firebase/firebase-js-sdk/commit/cb835e723fab2a85a4e073a3f09354e3e6520dd1) [#4232](https://github.com/firebase/firebase-js-sdk/pull/4232) - Add `startAfter` and `endBefore` filters for paginating RTDB queries.

## 0.8.3

### Patch Changes

- [`50abe6c4d`](https://github.com/firebase/firebase-js-sdk/commit/50abe6c4d455693ef6a3a3c1bc8ef6ab5b8bd9ea) [#4199](https://github.com/firebase/firebase-js-sdk/pull/4199) - Fixes an issue that caused `refFromUrl()` to reject production database URLs when `useEmulator()` was used.

## 0.8.2

### Patch Changes

- [`487f8e1d2`](https://github.com/firebase/firebase-js-sdk/commit/487f8e1d2c6bd1a54305f2b0f148b4985f3cea8e) [#4247](https://github.com/firebase/firebase-js-sdk/pull/4247) (fixes [#3681](https://github.com/firebase/firebase-js-sdk/issues/3681)) - Fix issue with multiple database instances when using Realtime Database emulator (#3681)

## 0.8.1

### Patch Changes

- Updated dependencies [[`4f6313262`](https://github.com/firebase/firebase-js-sdk/commit/4f63132622fa46ca7373ab93440c76bcb1822620)]:
  - @firebase/database-types@0.6.1

## 0.8.0

### Minor Changes

- [`34973cde2`](https://github.com/firebase/firebase-js-sdk/commit/34973cde218e570baccd235d5bb6c6146559f80b) [#3812](https://github.com/firebase/firebase-js-sdk/pull/3812) - Add a `get` method for database queries that returns server result when connected

## 0.7.1

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 0.7.0

### Minor Changes

- [`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c) [#3904](https://github.com/firebase/firebase-js-sdk/pull/3904) - Add a useEmulator(host, port) method to Realtime Database

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

* [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5) [#3968](https://github.com/firebase/firebase-js-sdk/pull/3968) - Updated the type definition for `ThenableReference` to only implement `then` and `catch`, which matches the implementation.

* Updated dependencies [[`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c), [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce), [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5)]:
  - @firebase/database-types@0.6.0
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3

## 0.6.13

### Patch Changes

- [`3d9b5a595`](https://github.com/firebase/firebase-js-sdk/commit/3d9b5a595813b6c4f7f6ef4e3625ae8856a9fa23) [#3736](https://github.com/firebase/firebase-js-sdk/pull/3736) - Fix detection of admin context in Realtime Database SDK

## 0.6.12

### Patch Changes

- [`d347c6ca1`](https://github.com/firebase/firebase-js-sdk/commit/d347c6ca1bcb7cd48ab2e4f7954cabafe761aea7) [#3650](https://github.com/firebase/firebase-js-sdk/pull/3650) - The SDK can now infer a default database URL if none is provided in the config.

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 0.6.11

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 0.6.10

### Patch Changes

- [`ef348fed`](https://github.com/firebase/firebase-js-sdk/commit/ef348fed291338351706a697cbb9fb17a9d06ff4) [#3511](https://github.com/firebase/firebase-js-sdk/pull/3511) - Added interface `Database` which is implemented by `FirebaseDatabase`. This allows consumer SDKs (such as the Firebase Admin SDK) to export the database types as an interface.

- Updated dependencies [[`ef348fed`](https://github.com/firebase/firebase-js-sdk/commit/ef348fed291338351706a697cbb9fb17a9d06ff4)]:
  - @firebase/database-types@0.5.2

## 0.6.9

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 0.6.8

### Patch Changes

- [`c2b737b2`](https://github.com/firebase/firebase-js-sdk/commit/c2b737b2187cb525af4d926ca477102db7835420) [#3228](https://github.com/firebase/firebase-js-sdk/pull/3228) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fix] Instead of using production auth, the SDK will use test credentials
  to connect to the Emulator when the RTDB SDK is used via the Firebase
  Admin SDK.

## 0.6.7

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
- [changed] Added internal HTTP header to the WebSocket connection.
- [feature] Added ServerValue.increment() to support atomic field value increments
  without transactions.
- [fixed] Fixed Realtime Database URL parsing bug to support domains with more than 3 components.

## 0.5.6

- [fixed] Fixed an issue that caused large numeric values with leading zeros to
  not always be sorted correctly.

## 0.5.3

- [changed] Internal cleanup to Node.JS support.

## 0.5.0

- [fixed] Fixed an issue that caused `.info/serverTimeOffset` events not to fire (#2043).
- [changed] Treat `ns` url query parameter as the default Realtime Database
  namespace name.

## 0.4.11

- [fixed] Fixed an issue where multi-byte UTF-8 characters would not be written correctly when using `firebase.js` or `firebase-database.js` (#2035).

## 0.4.0

- [changed] Improved consistency between the type annotations for `Query.on`/`Reference.on`,
  `Query.off`/`Reference.off` and `Query.once`/`Reference.once` (#1188, #1204).
