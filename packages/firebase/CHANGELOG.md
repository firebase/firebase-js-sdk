# firebase

## 9.20.0

### Minor Changes

- [`6b8e0c13d`](https://github.com/firebase/firebase-js-sdk/commit/6b8e0c13daaf476c7e6ea034006250d1f33dd828) [#7193](https://github.com/firebase/firebase-js-sdk/pull/7193) - [feature] Add reCAPTCHA enterprise support.

### Patch Changes

- Updated dependencies [[`b04f04081`](https://github.com/firebase/firebase-js-sdk/commit/b04f0408139f75c69b6f6eea396f3e961f658bd1), [`8c44d5863`](https://github.com/firebase/firebase-js-sdk/commit/8c44d586355ffd2d58b6841730ebdac89229954c), [`6b8e0c13d`](https://github.com/firebase/firebase-js-sdk/commit/6b8e0c13daaf476c7e6ea034006250d1f33dd828), [`b66908df6`](https://github.com/firebase/firebase-js-sdk/commit/b66908df6f280b4f7bfce984e07c169d426c990b)]:
  - @firebase/auth@0.23.0
  - @firebase/auth-compat@0.4.0
  - @firebase/app@0.9.8
  - @firebase/app-check@0.6.5
  - @firebase/firestore@3.10.1
  - @firebase/app-compat@0.2.8
  - @firebase/app-check-compat@0.3.5
  - @firebase/firestore-compat@0.3.7

## 9.19.1

### Patch Changes

- Updated dependencies [[`965396d52`](https://github.com/firebase/firebase-js-sdk/commit/965396d522243fcc17b63558823ad761c87ae1ba), [`bd51cecba`](https://github.com/firebase/firebase-js-sdk/commit/bd51cecba5cfc1b1c1ca46bf94e65320da3da609)]:
  - @firebase/app@0.9.7
  - @firebase/auth@0.22.0
  - @firebase/app-compat@0.2.7
  - @firebase/auth-compat@0.3.7

## 9.19.0

### Minor Changes

- [`60a730e37`](https://github.com/firebase/firebase-js-sdk/commit/60a730e37cb9b8f2260cfe4d8e3875018639a4b0) [#7015](https://github.com/firebase/firebase-js-sdk/pull/7015) - Introduces a new way to config Firestore SDK Cache.

### Patch Changes

- [`7d23aa4bd`](https://github.com/firebase/firebase-js-sdk/commit/7d23aa4bd1e29d2c10c771c0ab7919b6c5dd2d9b) [#7130](https://github.com/firebase/firebase-js-sdk/pull/7130) - Check that DOMException exists before referencing it, to fix react-native, which was broken by https://github.com/firebase/firebase-js-sdk/pull/7019 in v9.17.2.

- [`ce79f7fe2`](https://github.com/firebase/firebase-js-sdk/commit/ce79f7fe21c27d88621cecce99bb8b14b4117b36) [#7100](https://github.com/firebase/firebase-js-sdk/pull/7100) - Remove the deprecated gapi.auth from FirstPartyToken.

- Updated dependencies [[`60a730e37`](https://github.com/firebase/firebase-js-sdk/commit/60a730e37cb9b8f2260cfe4d8e3875018639a4b0), [`7d23aa4bd`](https://github.com/firebase/firebase-js-sdk/commit/7d23aa4bd1e29d2c10c771c0ab7919b6c5dd2d9b), [`58bae8757`](https://github.com/firebase/firebase-js-sdk/commit/58bae875799ed2ace8232f5d9e7aaaaa7a84d064), [`ce79f7fe2`](https://github.com/firebase/firebase-js-sdk/commit/ce79f7fe21c27d88621cecce99bb8b14b4117b36), [`00737a1ab`](https://github.com/firebase/firebase-js-sdk/commit/00737a1abd469f3deb041d8ff482165cc16bc34e), [`3435ba945`](https://github.com/firebase/firebase-js-sdk/commit/3435ba945a9febf5a0aece05517a5656f58b246f)]:
  - @firebase/firestore@3.10.0
  - @firebase/app@0.9.6
  - @firebase/auth@0.21.6
  - @firebase/analytics@0.9.5
  - @firebase/firestore-compat@0.3.6
  - @firebase/app-compat@0.2.6
  - @firebase/auth-compat@0.3.6
  - @firebase/analytics-compat@0.2.5

## 9.18.0

### Minor Changes

- [`5ba524313`](https://github.com/firebase/firebase-js-sdk/commit/5ba524313bdeddb012c44b1b1161c9229396b195) [#7053](https://github.com/firebase/firebase-js-sdk/pull/7053) - Add support for disjunctions in queries (OR queries).

### Patch Changes

- [`e2bf2eca2`](https://github.com/firebase/firebase-js-sdk/commit/e2bf2eca21308670c73d6c642a88c06f0b87d44a) [#7076](https://github.com/firebase/firebase-js-sdk/pull/7076) - Improved debug logging of networking abstractions

- [`5099f0f60`](https://github.com/firebase/firebase-js-sdk/commit/5099f0f60a5198b48942e8b2a574505432bdc213) [#6899](https://github.com/firebase/firebase-js-sdk/pull/6899) (fixes [#6509](https://github.com/firebase/firebase-js-sdk/issues/6509)) - Check navigator.userAgent, in addition to navigator.appVersion, when determining whether to work around an IndexedDb bug in Safari.

- Updated dependencies [[`e2bf2eca2`](https://github.com/firebase/firebase-js-sdk/commit/e2bf2eca21308670c73d6c642a88c06f0b87d44a), [`5099f0f60`](https://github.com/firebase/firebase-js-sdk/commit/5099f0f60a5198b48942e8b2a574505432bdc213), [`e0b677e70`](https://github.com/firebase/firebase-js-sdk/commit/e0b677e70ed2fd9e488737c77ebe2fc65d3a0822), [`5ba524313`](https://github.com/firebase/firebase-js-sdk/commit/5ba524313bdeddb012c44b1b1161c9229396b195)]:
  - @firebase/firestore@3.9.0
  - @firebase/app@0.9.5
  - @firebase/auth@0.21.5
  - @firebase/firestore-compat@0.3.5
  - @firebase/app-compat@0.2.5
  - @firebase/auth-compat@0.3.5

## 9.17.2

### Patch Changes

- [`b5f86b1a3`](https://github.com/firebase/firebase-js-sdk/commit/b5f86b1a305b3067fed12b024938f0c3f47de2ef) [#7018](https://github.com/firebase/firebase-js-sdk/pull/7018) - Internal refactor of platform-specific logic to create TextEncoder and TextDecoder objects.

- [`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6) [#7019](https://github.com/firebase/firebase-js-sdk/pull/7019) - Modify base64 decoding logic to throw on invalid input, rather than silently truncating it.

- Updated dependencies [[`36558bd2e`](https://github.com/firebase/firebase-js-sdk/commit/36558bd2e68e1ba3fb31d85ef997ab9ddf692d50), [`b5f86b1a3`](https://github.com/firebase/firebase-js-sdk/commit/b5f86b1a305b3067fed12b024938f0c3f47de2ef), [`b970dc522`](https://github.com/firebase/firebase-js-sdk/commit/b970dc52282e35d4d3fac947e330d830063caa5e), [`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6), [`67c5a0dc5`](https://github.com/firebase/firebase-js-sdk/commit/67c5a0dc55237391afceb956280cb04cfeaac66f), [`b30186ffc`](https://github.com/firebase/firebase-js-sdk/commit/b30186ffc15cd441521c8f43d3f9a7a4e9ce8820), [`c8a6e08b0`](https://github.com/firebase/firebase-js-sdk/commit/c8a6e08b01a52b3eca77ca9da8989dac2e77a972)]:
  - @firebase/firestore-compat@0.3.4
  - @firebase/firestore@3.8.4
  - @firebase/database-compat@0.3.4
  - @firebase/util@1.9.3
  - @firebase/auth@0.21.4
  - @firebase/analytics@0.9.4
  - @firebase/analytics-compat@0.2.4
  - @firebase/app@0.9.4
  - @firebase/app-check@0.6.4
  - @firebase/app-check-compat@0.3.4
  - @firebase/app-compat@0.2.4
  - @firebase/auth-compat@0.3.4
  - @firebase/database@0.14.4
  - @firebase/functions@0.9.4
  - @firebase/functions-compat@0.3.4
  - @firebase/installations@0.6.4
  - @firebase/installations-compat@0.2.4
  - @firebase/messaging@0.12.4
  - @firebase/messaging-compat@0.2.4
  - @firebase/performance@0.6.4
  - @firebase/performance-compat@0.2.4
  - @firebase/remote-config@0.4.4
  - @firebase/remote-config-compat@0.2.4
  - @firebase/storage@0.11.2
  - @firebase/storage-compat@0.3.2

## 9.17.1

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/auth@0.21.3
  - @firebase/auth-compat@0.3.3
  - @firebase/database@0.14.3
  - @firebase/database-compat@0.3.3
  - @firebase/firestore@3.8.3
  - @firebase/firestore-compat@0.3.3
  - @firebase/functions@0.9.3
  - @firebase/functions-compat@0.3.3
  - @firebase/storage@0.11.1
  - @firebase/util@1.9.2
  - @firebase/storage-compat@0.3.1
  - @firebase/analytics@0.9.3
  - @firebase/analytics-compat@0.2.3
  - @firebase/app@0.9.3
  - @firebase/app-check@0.6.3
  - @firebase/app-check-compat@0.3.3
  - @firebase/app-compat@0.2.3
  - @firebase/installations@0.6.3
  - @firebase/installations-compat@0.2.3
  - @firebase/messaging@0.12.3
  - @firebase/messaging-compat@0.2.3
  - @firebase/performance@0.6.3
  - @firebase/performance-compat@0.2.3
  - @firebase/remote-config@0.4.3
  - @firebase/remote-config-compat@0.2.3

## 9.17.0

### Minor Changes

- [`825e648b8`](https://github.com/firebase/firebase-js-sdk/commit/825e648b81ca63c7bc64f8700f7a46eb320b2106) [#6974](https://github.com/firebase/firebase-js-sdk/pull/6974) (fixes [#6944](https://github.com/firebase/firebase-js-sdk/issues/6944)) - Fixed issue where users were unable to check if an Error was an instance of `StorageError`.

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`6439f1173`](https://github.com/firebase/firebase-js-sdk/commit/6439f1173353f3857ab820675d572ea676340924), [`49ee786f2`](https://github.com/firebase/firebase-js-sdk/commit/49ee786f2b022e65aef45693e1a8b546d889ec10), [`825e648b8`](https://github.com/firebase/firebase-js-sdk/commit/825e648b81ca63c7bc64f8700f7a46eb320b2106), [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5), [`27b5e7d70`](https://github.com/firebase/firebase-js-sdk/commit/27b5e7d7081688599fc518b329a43db4319cdd1f)]:
  - @firebase/auth@0.21.2
  - @firebase/database-compat@0.3.2
  - @firebase/database@0.14.2
  - @firebase/storage@0.11.0
  - @firebase/storage-compat@0.3.0
  - @firebase/auth-compat@0.3.2
  - @firebase/firestore@3.8.2
  - @firebase/firestore-compat@0.3.2
  - @firebase/functions@0.9.2
  - @firebase/functions-compat@0.3.2
  - @firebase/messaging@0.12.2
  - @firebase/messaging-compat@0.2.2
  - @firebase/util@1.9.1
  - @firebase/analytics@0.9.2
  - @firebase/analytics-compat@0.2.2
  - @firebase/app@0.9.2
  - @firebase/app-check@0.6.2
  - @firebase/app-check-compat@0.3.2
  - @firebase/app-compat@0.2.2
  - @firebase/installations@0.6.2
  - @firebase/installations-compat@0.2.2
  - @firebase/performance@0.6.2
  - @firebase/performance-compat@0.2.2
  - @firebase/remote-config@0.4.2
  - @firebase/remote-config-compat@0.2.2

## 9.16.0

### Minor Changes

- [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8) [#6901](https://github.com/firebase/firebase-js-sdk/pull/6901) - Allow users to specify their environment as `node` or `browser` to override Firebase's runtime environment detection and force the SDK to act as if it were in the respective environment.

### Patch Changes

- Updated dependencies [[`a67eb5d04`](https://github.com/firebase/firebase-js-sdk/commit/a67eb5d04405b8133e81aad15f3fc9441eb66091), [`d8af08feb`](https://github.com/firebase/firebase-js-sdk/commit/d8af08febfd4507a28bcda38d475b8010ef20f92), [`a4056634a`](https://github.com/firebase/firebase-js-sdk/commit/a4056634a5119dd3f2ca935cae23b90fc99d84ee), [`a7622d49f`](https://github.com/firebase/firebase-js-sdk/commit/a7622d49f8a69bcdfb95b89dd1609a5c495fd529), [`1455bfa43`](https://github.com/firebase/firebase-js-sdk/commit/1455bfa4393383ab461de35ccbc2b171f92169df), [`50b8191f6`](https://github.com/firebase/firebase-js-sdk/commit/50b8191f6c51a936bd92a1a6a68af1cf201fc127), [`37f31c57b`](https://github.com/firebase/firebase-js-sdk/commit/37f31c57b62bc6486bc08d9e5c64e2c32d25cb0a), [`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/storage@0.10.1
  - @firebase/database@0.14.1
  - @firebase/firestore@3.8.1
  - @firebase/auth@0.21.1
  - @firebase/util@1.9.0
  - @firebase/storage-compat@0.2.1
  - @firebase/functions@0.9.1
  - @firebase/database-compat@0.3.1
  - @firebase/firestore-compat@0.3.1
  - @firebase/auth-compat@0.3.1
  - @firebase/analytics@0.9.1
  - @firebase/analytics-compat@0.2.1
  - @firebase/app@0.9.1
  - @firebase/app-check@0.6.1
  - @firebase/app-check-compat@0.3.1
  - @firebase/app-compat@0.2.1
  - @firebase/functions-compat@0.3.1
  - @firebase/installations@0.6.1
  - @firebase/installations-compat@0.2.1
  - @firebase/messaging@0.12.1
  - @firebase/messaging-compat@0.2.1
  - @firebase/performance@0.6.1
  - @firebase/performance-compat@0.2.1
  - @firebase/remote-config@0.4.1
  - @firebase/remote-config-compat@0.2.1

## 9.15.0

### Minor Changes

- [`ab3f16cba`](https://github.com/firebase/firebase-js-sdk/commit/ab3f16cbabc420fab0a322a21c9e28d3cbed4f24) [#6796](https://github.com/firebase/firebase-js-sdk/pull/6796) - Upgrade TypeScript to 4.7.4 (was 4.2.2)

- [`fde5adf63`](https://github.com/firebase/firebase-js-sdk/commit/fde5adf638dae4714ff7f25c75e475344907e05e) [#6694](https://github.com/firebase/firebase-js-sdk/pull/6694) - Functions in the Firestore package that return QueryConstraints (for example: `where(...)`, `limit(...)`, and `orderBy(...)`)
  now return a more specific type, which extends QueryConstraint. Refactoring and code that supports future features is also
  included in this release.

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- [`7e237cd47`](https://github.com/firebase/firebase-js-sdk/commit/7e237cd47d7ab923eec62e648e857a1e36d60520) [#6826](https://github.com/firebase/firebase-js-sdk/pull/6826) - Modify entry point ESM bundles to conform to Node ESM specs.

- Updated dependencies [[`ab3f16cba`](https://github.com/firebase/firebase-js-sdk/commit/ab3f16cbabc420fab0a322a21c9e28d3cbed4f24), [`37dd6f6f4`](https://github.com/firebase/firebase-js-sdk/commit/37dd6f6f471d9912db3800b9b377080752af8c10), [`fde5adf63`](https://github.com/firebase/firebase-js-sdk/commit/fde5adf638dae4714ff7f25c75e475344907e05e), [`e650f6498`](https://github.com/firebase/firebase-js-sdk/commit/e650f649854f3c39737fe4bade43f9eedc3e611f), [`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/firestore@3.8.0
  - @firebase/firestore-compat@0.3.0
  - @firebase/database@0.14.0
  - @firebase/database-compat@0.3.0
  - @firebase/auth@0.21.0
  - @firebase/util@1.8.0
  - @firebase/analytics@0.9.0
  - @firebase/analytics-compat@0.2.0
  - @firebase/app@0.9.0
  - @firebase/app-check@0.6.0
  - @firebase/app-check-compat@0.3.0
  - @firebase/app-compat@0.2.0
  - @firebase/app-types@0.9.0
  - @firebase/auth-compat@0.3.0
  - @firebase/functions@0.9.0
  - @firebase/functions-compat@0.3.0
  - @firebase/installations@0.6.0
  - @firebase/installations-compat@0.2.0
  - @firebase/messaging@0.12.0
  - @firebase/messaging-compat@0.2.0
  - @firebase/performance@0.6.0
  - @firebase/performance-compat@0.2.0
  - @firebase/remote-config@0.4.0
  - @firebase/remote-config-compat@0.2.0
  - @firebase/storage@0.10.0
  - @firebase/storage-compat@0.2.0

## 9.14.0

### Minor Changes

- [`0c0c58f47`](https://github.com/firebase/firebase-js-sdk/commit/0c0c58f474024a628ac0b43aacb086af8f2e794c) [#6773](https://github.com/firebase/firebase-js-sdk/pull/6773) - Add missing package that should have been included in https://github.com/firebase/firebase-js-sdk/pull/6728

### Patch Changes

- [`bf7cc8f69`](https://github.com/firebase/firebase-js-sdk/commit/bf7cc8f691f7a17730b071d3d9c27bd28a6e3980) [#6712](https://github.com/firebase/firebase-js-sdk/pull/6712) (fixes [#6613](https://github.com/firebase/firebase-js-sdk/issues/6613)) - Fix "missing index" error message to include the link to create the composite index.

- [`e2a90bf67`](https://github.com/firebase/firebase-js-sdk/commit/e2a90bf678eb6fa505f8b2f627e03cff622607b5) [#6729](https://github.com/firebase/firebase-js-sdk/pull/6729) - Fix transaction.set() failure without retry on "already-exists" error.

- Updated dependencies [[`3f1354f1f`](https://github.com/firebase/firebase-js-sdk/commit/3f1354f1f120f1fe4bcc11122a6e0b12fe3c6ac4), [`bf7cc8f69`](https://github.com/firebase/firebase-js-sdk/commit/bf7cc8f691f7a17730b071d3d9c27bd28a6e3980), [`8876b783f`](https://github.com/firebase/firebase-js-sdk/commit/8876b783f27ba8ba0ad0305db4812432efa17461), [`9e9ee7ba3`](https://github.com/firebase/firebase-js-sdk/commit/9e9ee7ba3383237e0b92ad8183dd0f12640f4f3a), [`457fc2eeb`](https://github.com/firebase/firebase-js-sdk/commit/457fc2eeb6922fd4eaa5e305cd10ee05e86293be), [`e2a90bf67`](https://github.com/firebase/firebase-js-sdk/commit/e2a90bf678eb6fa505f8b2f627e03cff622607b5)]:
  - @firebase/app@0.8.4
  - @firebase/performance@0.5.17
  - @firebase/firestore@3.7.3
  - @firebase/storage@0.9.14
  - @firebase/messaging@0.11.0
  - @firebase/app-check@0.5.17
  - @firebase/app-compat@0.1.39
  - @firebase/performance-compat@0.1.17
  - @firebase/firestore-compat@0.2.3
  - @firebase/storage-compat@0.1.22
  - @firebase/messaging-compat@0.1.21
  - @firebase/app-check-compat@0.2.17

## 9.13.0

### Minor Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

### Patch Changes

- Updated dependencies [[`de1c717c2`](https://github.com/firebase/firebase-js-sdk/commit/de1c717c2f69e9f21744135b74f92829927b200b), [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5), [`4b9da74db`](https://github.com/firebase/firebase-js-sdk/commit/4b9da74dbca7ebca3a870275364df7129ed016fe)]:
  - @firebase/storage@0.9.13
  - @firebase/analytics@0.8.4
  - @firebase/analytics-compat@0.1.17
  - @firebase/app@0.8.3
  - @firebase/app-check@0.5.16
  - @firebase/app-check-compat@0.2.16
  - @firebase/app-compat@0.1.38
  - @firebase/app-types@0.8.1
  - @firebase/auth@0.20.11
  - @firebase/auth-compat@0.2.24
  - @firebase/database@0.13.10
  - @firebase/database-compat@0.2.10
  - @firebase/firestore@3.7.2
  - @firebase/firestore-compat@0.2.2
  - @firebase/functions@0.8.8
  - @firebase/functions-compat@0.2.8
  - @firebase/installations@0.5.16
  - @firebase/installations-compat@0.1.16
  - @firebase/messaging@0.10.0
  - @firebase/messaging-compat@0.1.20
  - @firebase/performance@0.5.16
  - @firebase/performance-compat@0.1.16
  - @firebase/remote-config@0.3.15
  - @firebase/remote-config-compat@0.1.16
  - @firebase/storage-compat@0.1.21
  - @firebase/util@1.7.3

## 9.12.1

### Patch Changes

- Updated dependencies [[`5f55ed828`](https://github.com/firebase/firebase-js-sdk/commit/5f55ed828e7e7d3084590ff04d8c3e75fc718a51), [`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d), [`03d1fabcb`](https://github.com/firebase/firebase-js-sdk/commit/03d1fabcb652b3af61631d1e1100ed13efa6fc87)]:
  - @firebase/storage@0.9.12
  - @firebase/util@1.7.2
  - @firebase/analytics@0.8.3
  - @firebase/storage-compat@0.1.20
  - @firebase/analytics-compat@0.1.16
  - @firebase/app@0.8.2
  - @firebase/app-check@0.5.15
  - @firebase/app-check-compat@0.2.15
  - @firebase/app-compat@0.1.37
  - @firebase/auth@0.20.10
  - @firebase/auth-compat@0.2.23
  - @firebase/database@0.13.9
  - @firebase/database-compat@0.2.9
  - @firebase/firestore@3.7.1
  - @firebase/firestore-compat@0.2.1
  - @firebase/functions@0.8.7
  - @firebase/functions-compat@0.2.7
  - @firebase/installations@0.5.15
  - @firebase/installations-compat@0.1.15
  - @firebase/messaging@0.9.19
  - @firebase/messaging-compat@0.1.19
  - @firebase/performance@0.5.15
  - @firebase/performance-compat@0.1.15
  - @firebase/remote-config@0.3.14
  - @firebase/remote-config-compat@0.1.15

## 9.12.0

### Minor Changes

- [`397317b53`](https://github.com/firebase/firebase-js-sdk/commit/397317b53c4d9d8aee761f566adf3616aef844ed) [#6643](https://github.com/firebase/firebase-js-sdk/pull/6643) - Set withCredentials=true when making requests via non-streaming RPCs, like is done for streaming RPCs.

### Patch Changes

- [`0a112bd2a`](https://github.com/firebase/firebase-js-sdk/commit/0a112bd2aee2e709d6733b1a36876e6fae1e347f) [#6624](https://github.com/firebase/firebase-js-sdk/pull/6624) (fixes [#5873](https://github.com/firebase/firebase-js-sdk/issues/5873)) - Fix Firestore failing to raise initial snapshot from empty local cache result

- Updated dependencies [[`0a112bd2a`](https://github.com/firebase/firebase-js-sdk/commit/0a112bd2aee2e709d6733b1a36876e6fae1e347f), [`5aa48d0ab`](https://github.com/firebase/firebase-js-sdk/commit/5aa48d0ab432002ccf49d65bf2ff637e82a2b402), [`4eb8145fb`](https://github.com/firebase/firebase-js-sdk/commit/4eb8145fb3b503884ea610e813be359127d1a705), [`397317b53`](https://github.com/firebase/firebase-js-sdk/commit/397317b53c4d9d8aee761f566adf3616aef844ed), [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`1fbc4c4b7`](https://github.com/firebase/firebase-js-sdk/commit/1fbc4c4b7f893ac1f973ccc29205771adec536ca), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/firestore@3.7.0
  - @firebase/database@0.13.8
  - @firebase/storage@0.9.11
  - @firebase/firestore-compat@0.2.0
  - @firebase/functions@0.8.6
  - @firebase/util@1.7.1
  - @firebase/analytics@0.8.2
  - @firebase/database-compat@0.2.8
  - @firebase/storage-compat@0.1.19
  - @firebase/functions-compat@0.2.6
  - @firebase/analytics-compat@0.1.15
  - @firebase/app@0.8.1
  - @firebase/app-check@0.5.14
  - @firebase/app-check-compat@0.2.14
  - @firebase/app-compat@0.1.36
  - @firebase/auth@0.20.9
  - @firebase/auth-compat@0.2.22
  - @firebase/installations@0.5.14
  - @firebase/installations-compat@0.1.14
  - @firebase/messaging@0.9.18
  - @firebase/messaging-compat@0.1.18
  - @firebase/performance@0.5.14
  - @firebase/performance-compat@0.1.14
  - @firebase/remote-config@0.3.13
  - @firebase/remote-config-compat@0.1.14

## 9.11.0

### Minor Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

* [`ee871fc0b`](https://github.com/firebase/firebase-js-sdk/commit/ee871fc0b157e1a186c2895b4290d70c8d1b986f) [#6608](https://github.com/firebase/firebase-js-sdk/pull/6608) - Added `getCountFromServer()` (`getCount()` in the Lite SDK), which fetches the number of documents in the result set without actually downloading the documents.

### Patch Changes

- Updated dependencies [[`e35db6f95`](https://github.com/firebase/firebase-js-sdk/commit/e35db6f955f1b712ff67a991d8291352f28708e2), [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4), [`c6ba6fc0f`](https://github.com/firebase/firebase-js-sdk/commit/c6ba6fc0f44178d56fe165f71a798663516a2904), [`b3951c6e4`](https://github.com/firebase/firebase-js-sdk/commit/b3951c6e42559d8aa82711b71440f4adcdae3b56), [`ee871fc0b`](https://github.com/firebase/firebase-js-sdk/commit/ee871fc0b157e1a186c2895b4290d70c8d1b986f)]:
  - @firebase/firestore@3.6.0
  - @firebase/app@0.8.0
  - @firebase/app-types@0.8.0
  - @firebase/util@1.7.0
  - @firebase/auth@0.20.8
  - @firebase/database@0.13.7
  - @firebase/functions@0.8.5
  - @firebase/storage@0.9.10
  - @firebase/app-check@0.5.13
  - @firebase/firestore-compat@0.1.26
  - @firebase/analytics@0.8.1
  - @firebase/app-compat@0.1.35
  - @firebase/installations@0.5.13
  - @firebase/messaging@0.9.17
  - @firebase/performance@0.5.13
  - @firebase/remote-config@0.3.12
  - @firebase/analytics-compat@0.1.14
  - @firebase/app-check-compat@0.2.13
  - @firebase/auth-compat@0.2.21
  - @firebase/database-compat@0.2.7
  - @firebase/functions-compat@0.2.5
  - @firebase/installations-compat@0.1.13
  - @firebase/messaging-compat@0.1.17
  - @firebase/performance-compat@0.1.13
  - @firebase/remote-config-compat@0.1.13
  - @firebase/storage-compat@0.1.18

## 9.10.0

### Minor Changes

- [`7c0c640a4`](https://github.com/firebase/firebase-js-sdk/commit/7c0c640a446c729ac66fec27dfd77d6398a468db) [#6107](https://github.com/firebase/firebase-js-sdk/pull/6107) - Enable encodeInitMessageHeaders. This transitions the Firestore client from encoding HTTP Headers via the Query Param to the request's POST payload.

  Requires Cloud Firestore Emulator v1.14.4 or newer.

### Patch Changes

- Updated dependencies [[`e06d9069c`](https://github.com/firebase/firebase-js-sdk/commit/e06d9069ca07429df248d9134aebdea1118e9427), [`7c0c640a4`](https://github.com/firebase/firebase-js-sdk/commit/7c0c640a446c729ac66fec27dfd77d6398a468db), [`666c8ec1f`](https://github.com/firebase/firebase-js-sdk/commit/666c8ec1ff5cb5b8947a142e26c0a2ecb18f8bb4)]:
  - @firebase/app@0.7.33
  - @firebase/auth@0.20.7
  - @firebase/firestore@3.5.0
  - @firebase/app-compat@0.1.34
  - @firebase/auth-compat@0.2.20
  - @firebase/firestore-compat@0.1.25

## 9.9.4

### Patch Changes

- Updated dependencies [[`f35533594`](https://github.com/firebase/firebase-js-sdk/commit/f355335942b874ba390bcbf3be6de44a3d33dce8), [`bea604ea3`](https://github.com/firebase/firebase-js-sdk/commit/bea604ea33c529e755cc3fcdc0a2ea75d04b9f19), [`b993aeec4`](https://github.com/firebase/firebase-js-sdk/commit/b993aeec4a8f5188d1f53d07808da079f3ade846)]:
  - @firebase/app@0.7.32
  - @firebase/database@0.13.6
  - @firebase/auth@0.20.6
  - @firebase/firestore@3.4.15
  - @firebase/app-compat@0.1.33
  - @firebase/database-compat@0.2.6
  - @firebase/auth-compat@0.2.19
  - @firebase/firestore-compat@0.1.24

## 9.9.3

### Patch Changes

- [`dcfebe8dc`](https://github.com/firebase/firebase-js-sdk/commit/dcfebe8dc801bb4dad23c48d9a379510ac86011e) [#6543](https://github.com/firebase/firebase-js-sdk/pull/6543) (fixes [#6503](https://github.com/firebase/firebase-js-sdk/issues/6503)) - Removed all references to `@firebase/polyfill`.

- Updated dependencies [[`9f1e3c667`](https://github.com/firebase/firebase-js-sdk/commit/9f1e3c66747126c8e24894d73f7fa27480bec08d), [`a5d9e1083`](https://github.com/firebase/firebase-js-sdk/commit/a5d9e10831c2877e9d15c8a33b15557e4251c4de), [`fcd4b8ac3`](https://github.com/firebase/firebase-js-sdk/commit/fcd4b8ac36636a60d83cd3370969ff9192f9e6ad)]:
  - @firebase/app@0.7.31
  - @firebase/database-compat@0.2.5
  - @firebase/database@0.13.5
  - @firebase/app-compat@0.1.32

## 9.9.2

### Patch Changes

- Updated dependencies [[`82a6add13`](https://github.com/firebase/firebase-js-sdk/commit/82a6add1354fe7e4ac1d444157ac027cdd41da6e), [`f5426a512`](https://github.com/firebase/firebase-js-sdk/commit/f5426a51275bb611a5d9a6df3200d0fe5095afa2), [`10765511f`](https://github.com/firebase/firebase-js-sdk/commit/10765511f7ba33293f7a15af1f98d69a261c019d), [`65838089d`](https://github.com/firebase/firebase-js-sdk/commit/65838089da47965e5e39e58c76a81a74666b215e)]:
  - @firebase/app@0.7.30
  - @firebase/firestore@3.4.14
  - @firebase/database@0.13.4
  - @firebase/database-compat@0.2.4
  - @firebase/app-compat@0.1.31
  - @firebase/firestore-compat@0.1.23

## 9.9.1

### Patch Changes

- Updated dependencies [[`1703bb31a`](https://github.com/firebase/firebase-js-sdk/commit/1703bb31afa806087167079641af79c9293ab423), [`f36d627af`](https://github.com/firebase/firebase-js-sdk/commit/f36d627af6e1f5ed98e21f9be29f59d2c8c503cb)]:
  - @firebase/app@0.7.29
  - @firebase/firestore@3.4.13
  - @firebase/app-check@0.5.12
  - @firebase/app-compat@0.1.30
  - @firebase/firestore-compat@0.1.22
  - @firebase/app-check-compat@0.2.12

## 9.9.0

### Minor Changes

- [`1d3a34d7d`](https://github.com/firebase/firebase-js-sdk/commit/1d3a34d7da5bf3c267d014efb587e03c46ff3064) [#6376](https://github.com/firebase/firebase-js-sdk/pull/6376) - Add function `setConsent()` to set the applicable end user "consent" state.

* [`69e2ee064`](https://github.com/firebase/firebase-js-sdk/commit/69e2ee064e0729d8da823f1e60f6fb7f3bbe5700) [#6367](https://github.com/firebase/firebase-js-sdk/pull/6367) - Add function `setDefaultEventParameters()` to set data that will be logged on every Analytics SDK event

### Patch Changes

- [`5edd81fb5`](https://github.com/firebase/firebase-js-sdk/commit/5edd81fb5e99b6db32d8c44681956f8d78d4b42e) [#6404](https://github.com/firebase/firebase-js-sdk/pull/6404) - Add installations CDN build and entry point.

- Updated dependencies [[`c187446a2`](https://github.com/firebase/firebase-js-sdk/commit/c187446a202d881f55800be167cdb37b4d0e4a13), [`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf), [`1d3a34d7d`](https://github.com/firebase/firebase-js-sdk/commit/1d3a34d7da5bf3c267d014efb587e03c46ff3064), [`69e2ee064`](https://github.com/firebase/firebase-js-sdk/commit/69e2ee064e0729d8da823f1e60f6fb7f3bbe5700), [`1261d8323`](https://github.com/firebase/firebase-js-sdk/commit/1261d832345ff4505391a150cb9c32719da37eb0), [`6a8be1337`](https://github.com/firebase/firebase-js-sdk/commit/6a8be1337f19a49db40e0c757f571f42b5b4d494), [`e673dc808`](https://github.com/firebase/firebase-js-sdk/commit/e673dc808adc14baa499c4ecc31fdb82b1ff0757), [`ad773fa45`](https://github.com/firebase/firebase-js-sdk/commit/ad773fa451b13f9d58b3f27f7ec6570117b0cc27), [`8c52a96ed`](https://github.com/firebase/firebase-js-sdk/commit/8c52a96edac5b65501ee4eeb234c4bb8e70a5dd5)]:
  - @firebase/database@0.13.3
  - @firebase/util@1.6.3
  - @firebase/analytics@0.8.0
  - @firebase/auth@0.20.5
  - @firebase/functions@0.8.4
  - @firebase/firestore@3.4.12
  - @firebase/database-compat@0.2.3
  - @firebase/analytics-compat@0.1.13
  - @firebase/app@0.7.28
  - @firebase/app-check@0.5.11
  - @firebase/app-check-compat@0.2.11
  - @firebase/app-compat@0.1.29
  - @firebase/auth-compat@0.2.18
  - @firebase/firestore-compat@0.1.21
  - @firebase/functions-compat@0.2.4
  - @firebase/installations@0.5.12
  - @firebase/installations-compat@0.1.12
  - @firebase/messaging@0.9.16
  - @firebase/messaging-compat@0.1.16
  - @firebase/performance@0.5.12
  - @firebase/performance-compat@0.1.12
  - @firebase/remote-config@0.3.11
  - @firebase/remote-config-compat@0.1.12
  - @firebase/storage@0.9.9
  - @firebase/storage-compat@0.1.17

## 9.8.4

### Patch Changes

- Updated dependencies [[`578dc5836`](https://github.com/firebase/firebase-js-sdk/commit/578dc58365c6c71d8ad01dd8b9dbe829e76de068), [`835f1d46a`](https://github.com/firebase/firebase-js-sdk/commit/835f1d46a6780535bc660ef7dc23293350d5fe43), [`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/database@0.13.2
  - @firebase/analytics@0.7.11
  - @firebase/app-check@0.5.10
  - @firebase/util@1.6.2
  - @firebase/database-compat@0.2.2
  - @firebase/analytics-compat@0.1.12
  - @firebase/app-check-compat@0.2.10
  - @firebase/app@0.7.27
  - @firebase/app-compat@0.1.28
  - @firebase/auth@0.20.4
  - @firebase/auth-compat@0.2.17
  - @firebase/firestore@3.4.11
  - @firebase/firestore-compat@0.1.20
  - @firebase/functions@0.8.3
  - @firebase/functions-compat@0.2.3
  - @firebase/installations@0.5.11
  - @firebase/messaging@0.9.15
  - @firebase/messaging-compat@0.1.15
  - @firebase/performance@0.5.11
  - @firebase/performance-compat@0.1.11
  - @firebase/remote-config@0.3.10
  - @firebase/remote-config-compat@0.1.11
  - @firebase/storage@0.9.8
  - @firebase/storage-compat@0.1.16

## 9.8.3

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

- Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5), [`497d34c84`](https://github.com/firebase/firebase-js-sdk/commit/497d34c8472a19cb8baca56985c98346e5a4727d), [`d6338f0af`](https://github.com/firebase/firebase-js-sdk/commit/d6338f0af0f9914d2cd9a16435a9e2ef267d2f4c), [`d4b52b612`](https://github.com/firebase/firebase-js-sdk/commit/d4b52b612cf73610c57a3c08a0415ab7b622a70a), [`c66d59c3d`](https://github.com/firebase/firebase-js-sdk/commit/c66d59c3dcfea71bcdb61715f59911dd8a18d717)]:
  - @firebase/analytics-compat@0.1.11
  - @firebase/analytics@0.7.10
  - @firebase/app-check-compat@0.2.9
  - @firebase/app-check@0.5.9
  - @firebase/app-compat@0.1.27
  - @firebase/app@0.7.26
  - @firebase/auth-compat@0.2.16
  - @firebase/auth@0.20.3
  - @firebase/database-compat@0.2.1
  - @firebase/database@0.13.1
  - @firebase/firestore-compat@0.1.19
  - @firebase/firestore@3.4.10
  - @firebase/functions-compat@0.2.2
  - @firebase/functions@0.8.2
  - @firebase/installations@0.5.10
  - @firebase/messaging-compat@0.1.14
  - @firebase/messaging@0.9.14
  - @firebase/performance-compat@0.1.10
  - @firebase/performance@0.5.10
  - @firebase/remote-config-compat@0.1.10
  - @firebase/remote-config@0.3.9
  - @firebase/storage-compat@0.1.15
  - @firebase/storage@0.9.7
  - @firebase/util@1.6.1

## 9.8.2

### Patch Changes

- Updated dependencies [[`63ac2ed28`](https://github.com/firebase/firebase-js-sdk/commit/63ac2ed28f237950290a7af2dcdcf1518ddaee4b), [`88517b591`](https://github.com/firebase/firebase-js-sdk/commit/88517b59179410e43d5d5129a1fefc355cd1d4eb), [`63ac2ed28`](https://github.com/firebase/firebase-js-sdk/commit/63ac2ed28f237950290a7af2dcdcf1518ddaee4b)]:
  - @firebase/app@0.7.25
  - @firebase/auth@0.20.2
  - @firebase/auth-compat@0.2.15
  - @firebase/app-compat@0.1.26

## 9.8.1

### Patch Changes

- Updated dependencies [[`07cf0f1c9`](https://github.com/firebase/firebase-js-sdk/commit/07cf0f1c9033373bf1d3a8a1958385f177506c6c)]:
  - @firebase/app@0.7.24
  - @firebase/auth@0.20.1
  - @firebase/app-compat@0.1.25
  - @firebase/auth-compat@0.2.14

## 9.8.0

### Minor Changes

- [`63caee2a5`](https://github.com/firebase/firebase-js-sdk/commit/63caee2a536892c9359a6ca5860d60294ce633e3) [#6237](https://github.com/firebase/firebase-js-sdk/pull/6237) - Bump main package due to minor bumps in auth and database.

### Patch Changes

- Updated dependencies [[`874cdbbcc`](https://github.com/firebase/firebase-js-sdk/commit/874cdbbccbc2bf8f4ee18abe220e87dc52e6a8db), [`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801), [`dfab18af6`](https://github.com/firebase/firebase-js-sdk/commit/dfab18af66beeed14b2524f926af5bda506856a6), [`1ac3c9d41`](https://github.com/firebase/firebase-js-sdk/commit/1ac3c9d41e8f69a94c64c6e0caf5f1a159b7dc3c), [`9c6808fea`](https://github.com/firebase/firebase-js-sdk/commit/9c6808fea231d1ab6de6f6ab548c67b751a12a78)]:
  - @firebase/database@0.13.0
  - @firebase/util@1.6.0
  - @firebase/app@0.7.23
  - @firebase/installations@0.5.9
  - @firebase/messaging@0.9.13
  - @firebase/firestore@3.4.9
  - @firebase/auth@0.20.0
  - @firebase/auth-compat@0.2.13
  - @firebase/database-compat@0.2.0
  - @firebase/analytics@0.7.9
  - @firebase/analytics-compat@0.1.10
  - @firebase/app-check@0.5.8
  - @firebase/app-check-compat@0.2.8
  - @firebase/app-compat@0.1.24
  - @firebase/firestore-compat@0.1.18
  - @firebase/functions@0.8.1
  - @firebase/functions-compat@0.2.1
  - @firebase/messaging-compat@0.1.13
  - @firebase/performance@0.5.9
  - @firebase/performance-compat@0.1.9
  - @firebase/remote-config@0.3.8
  - @firebase/remote-config-compat@0.1.9
  - @firebase/storage@0.9.6
  - @firebase/storage-compat@0.1.14

## 9.7.0

### Minor Changes

- [`e76305a0f`](https://github.com/firebase/firebase-js-sdk/commit/e76305a0f2523a9dafe93c091708abcf14ac5b31) [#6191](https://github.com/firebase/firebase-js-sdk/pull/6191) - Minor version bump to umbrella package to match functions bump.

### Patch Changes

- Updated dependencies [[`c69c6898a`](https://github.com/firebase/firebase-js-sdk/commit/c69c6898a3d14ddcc6c6cafd3a219064b500c4f6), [`38da5d9be`](https://github.com/firebase/firebase-js-sdk/commit/38da5d9be4a001038548947a85c9b612e5275e32)]:
  - @firebase/app@0.7.22
  - @firebase/functions-compat@0.2.0
  - @firebase/functions@0.8.0
  - @firebase/app-check@0.5.7
  - @firebase/app-compat@0.1.23
  - @firebase/app-check-compat@0.2.7

## 9.6.11

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59), [`05dc9d6a0`](https://github.com/firebase/firebase-js-sdk/commit/05dc9d6a0db3058611dd7a2dc34daa726f9ba20d), [`7a4e65cef`](https://github.com/firebase/firebase-js-sdk/commit/7a4e65cef9468a20fb32dc112aa7113345bc76c5)]:
  - @firebase/util@1.5.2
  - @firebase/firestore@3.4.8
  - @firebase/database@0.12.8
  - @firebase/database-compat@0.1.8
  - @firebase/analytics@0.7.8
  - @firebase/analytics-compat@0.1.9
  - @firebase/app@0.7.21
  - @firebase/app-check@0.5.6
  - @firebase/app-check-compat@0.2.6
  - @firebase/app-compat@0.1.22
  - @firebase/auth@0.19.12
  - @firebase/auth-compat@0.2.12
  - @firebase/firestore-compat@0.1.17
  - @firebase/functions@0.7.11
  - @firebase/functions-compat@0.1.12
  - @firebase/installations@0.5.8
  - @firebase/messaging@0.9.12
  - @firebase/messaging-compat@0.1.12
  - @firebase/performance@0.5.8
  - @firebase/performance-compat@0.1.8
  - @firebase/remote-config@0.3.7
  - @firebase/remote-config-compat@0.1.8
  - @firebase/storage@0.9.5
  - @firebase/storage-compat@0.1.13

## 9.6.10

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef), [`349648917`](https://github.com/firebase/firebase-js-sdk/commit/34964891701cf68699b053d85010c78c6db27a38), [`69aa7b02d`](https://github.com/firebase/firebase-js-sdk/commit/69aa7b02df3b4d1f9832b7713951936b6bf32ca9)]:
  - @firebase/util@1.5.1
  - @firebase/app-check-compat@0.2.5
  - @firebase/firestore@3.4.7
  - @firebase/analytics@0.7.7
  - @firebase/analytics-compat@0.1.8
  - @firebase/app@0.7.20
  - @firebase/app-check@0.5.5
  - @firebase/app-compat@0.1.21
  - @firebase/auth@0.19.11
  - @firebase/auth-compat@0.2.11
  - @firebase/database@0.12.7
  - @firebase/database-compat@0.1.7
  - @firebase/firestore-compat@0.1.16
  - @firebase/functions@0.7.10
  - @firebase/functions-compat@0.1.11
  - @firebase/installations@0.5.7
  - @firebase/messaging@0.9.11
  - @firebase/messaging-compat@0.1.11
  - @firebase/performance@0.5.7
  - @firebase/performance-compat@0.1.7
  - @firebase/remote-config@0.3.6
  - @firebase/remote-config-compat@0.1.7
  - @firebase/storage@0.9.4
  - @firebase/storage-compat@0.1.12

## 9.6.9

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03), [`7405e7d59`](https://github.com/firebase/firebase-js-sdk/commit/7405e7d593b40c9945c32ffbe66ac6fb11e2991e), [`a7f4a2eb6`](https://github.com/firebase/firebase-js-sdk/commit/a7f4a2eb6ed08596dffe75825bca1a2034bfcd2e), [`ddeff8384`](https://github.com/firebase/firebase-js-sdk/commit/ddeff8384ab8a927f02244e2591db525fd58c7dd), [`927c1afc1`](https://github.com/firebase/firebase-js-sdk/commit/927c1afc103e4f9b8a75320d3946a4c840445a2a)]:
  - @firebase/app@0.7.19
  - @firebase/installations@0.5.6
  - @firebase/messaging@0.9.10
  - @firebase/util@1.5.0
  - @firebase/auth-compat@0.2.10
  - @firebase/auth@0.19.10
  - @firebase/app-check@0.5.4
  - @firebase/analytics@0.7.6
  - @firebase/app-compat@0.1.20
  - @firebase/database@0.12.6
  - @firebase/firestore@3.4.6
  - @firebase/functions@0.7.9
  - @firebase/performance@0.5.6
  - @firebase/remote-config@0.3.5
  - @firebase/storage@0.9.3
  - @firebase/messaging-compat@0.1.10
  - @firebase/analytics-compat@0.1.7
  - @firebase/app-check-compat@0.2.4
  - @firebase/database-compat@0.1.6
  - @firebase/firestore-compat@0.1.15
  - @firebase/functions-compat@0.1.10
  - @firebase/performance-compat@0.1.6
  - @firebase/remote-config-compat@0.1.6
  - @firebase/storage-compat@0.1.11

## 9.6.8

### Patch Changes

- Updated dependencies [[`b3e4af842`](https://github.com/firebase/firebase-js-sdk/commit/b3e4af842786af7371430fa5b04a814435faa791), [`1588990b7`](https://github.com/firebase/firebase-js-sdk/commit/1588990b7fb06b6fa545c0d478663e137ec0ea07)]:
  - @firebase/messaging@0.9.9
  - @firebase/app@0.7.18
  - @firebase/messaging-compat@0.1.9
  - @firebase/app-compat@0.1.19

## 9.6.7

### Patch Changes

- Updated dependencies [[`bb8f37c3e`](https://github.com/firebase/firebase-js-sdk/commit/bb8f37c3e83e73876d14fa751cb04ae5e1367394), [`f5ac47fb1`](https://github.com/firebase/firebase-js-sdk/commit/f5ac47fb1a44f7b985fcae1d934e1ffb6ba41d67), [`c1b9cf120`](https://github.com/firebase/firebase-js-sdk/commit/c1b9cf1201807fc177a89c9613c06130524563e4), [`e9619685b`](https://github.com/firebase/firebase-js-sdk/commit/e9619685b9153f7d6f8767e09e2e1eacc337df76), [`3a8d4c1d1`](https://github.com/firebase/firebase-js-sdk/commit/3a8d4c1d1a5e5fda5906b1feb96324efb68739cd)]:
  - @firebase/app@0.7.17
  - @firebase/firestore@3.4.5
  - @firebase/auth@0.19.9
  - @firebase/app-compat@0.1.18
  - @firebase/firestore-compat@0.1.14
  - @firebase/auth-compat@0.2.9

## 9.6.6

### Patch Changes

- Updated dependencies [[`af9234866`](https://github.com/firebase/firebase-js-sdk/commit/af923486662bc9449cca122b55840b045c9b4a5a), [`0a04a1c06`](https://github.com/firebase/firebase-js-sdk/commit/0a04a1c0657d74657b88aa5e67608b815cb3c03d)]:
  - @firebase/app@0.7.16
  - @firebase/auth@0.19.8
  - @firebase/messaging@0.9.8
  - @firebase/app-compat@0.1.17
  - @firebase/auth-compat@0.2.8
  - @firebase/messaging-compat@0.1.8

## 9.6.5

### Patch Changes

- Updated dependencies [[`4983f4d5a`](https://github.com/firebase/firebase-js-sdk/commit/4983f4d5a0dc385c5b3e042ace44c8204d3cce81), [`e28b0e413`](https://github.com/firebase/firebase-js-sdk/commit/e28b0e413decb115c846a7b5ed1e63dbf55c56ab), [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f), [`e04b7452b`](https://github.com/firebase/firebase-js-sdk/commit/e04b7452bae10e6525cfb9c551f76a1aa98f9078), [`2820674b8`](https://github.com/firebase/firebase-js-sdk/commit/2820674b848e918ab164e7d0ec9d5b838bbfa6e0)]:
  - @firebase/app@0.7.15
  - @firebase/auth-compat@0.2.7
  - @firebase/auth@0.19.7
  - @firebase/firestore@3.4.4
  - @firebase/functions@0.7.8
  - @firebase/storage@0.9.2
  - @firebase/app-compat@0.1.16
  - @firebase/storage-compat@0.1.10
  - @firebase/firestore-compat@0.1.13
  - @firebase/functions-compat@0.1.9

## 9.6.4

### Patch Changes

- Updated dependencies [[`93e6126b3`](https://github.com/firebase/firebase-js-sdk/commit/93e6126b3dfde795423109f5aaaf0a010cb142b6), [`67b6decbb`](https://github.com/firebase/firebase-js-sdk/commit/67b6decbb9b5ee806d4109b9b6c188c4933e1270), [`922e9ed9a`](https://github.com/firebase/firebase-js-sdk/commit/922e9ed9a68c130aefa0cdb9b27720b73011c397)]:
  - @firebase/app@0.7.14
  - @firebase/messaging@0.9.7
  - @firebase/messaging-compat@0.1.7
  - @firebase/auth@0.19.6
  - @firebase/app-compat@0.1.15
  - @firebase/auth-compat@0.2.6

## 9.6.3

### Patch Changes

- Updated dependencies [[`044a8d7f9`](https://github.com/firebase/firebase-js-sdk/commit/044a8d7f95a0ba0d34123ff5fd7a4bcb1bd3d328), [`ff2f7d4c8`](https://github.com/firebase/firebase-js-sdk/commit/ff2f7d4c85c0bda94b14d66237faa0e5da93bfa4), [`88d43ec00`](https://github.com/firebase/firebase-js-sdk/commit/88d43ec0027ff857923ab41255b3650e666fa29e), [`3c20727d8`](https://github.com/firebase/firebase-js-sdk/commit/3c20727d83f2d68edc108e8112b06d3232a7d310)]:
  - @firebase/app@0.7.13
  - @firebase/firestore@3.4.3
  - @firebase/messaging@0.9.6
  - @firebase/app-compat@0.1.14
  - @firebase/firestore-compat@0.1.12
  - @firebase/messaging-compat@0.1.6

## 9.6.2

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49), [`e3a5248fc`](https://github.com/firebase/firebase-js-sdk/commit/e3a5248fc8536fe2ca6d97483aa7e1b3f737dd17), [`7f05d22e8`](https://github.com/firebase/firebase-js-sdk/commit/7f05d22e827f1fd0732ad33fda203a20566d3964)]:
  - @firebase/firestore@3.4.2
  - @firebase/storage@0.9.1
  - @firebase/util@1.4.3
  - @firebase/auth-compat@0.2.5
  - @firebase/auth@0.19.5
  - @firebase/firestore-compat@0.1.11
  - @firebase/storage-compat@0.1.9
  - @firebase/analytics@0.7.5
  - @firebase/analytics-compat@0.1.6
  - @firebase/app@0.7.12
  - @firebase/app-check@0.5.3
  - @firebase/app-check-compat@0.2.3
  - @firebase/app-compat@0.1.13
  - @firebase/database@0.12.5
  - @firebase/database-compat@0.1.5
  - @firebase/functions@0.7.7
  - @firebase/functions-compat@0.1.8
  - @firebase/installations@0.5.5
  - @firebase/messaging@0.9.5
  - @firebase/messaging-compat@0.1.5
  - @firebase/performance@0.5.5
  - @firebase/performance-compat@0.1.5
  - @firebase/remote-config@0.3.4
  - @firebase/remote-config-compat@0.1.5

## 9.6.1

### Patch Changes

- Updated dependencies [[`fd8cd3ec4`](https://github.com/firebase/firebase-js-sdk/commit/fd8cd3ec4b7d0747fca258d468ee094573a08bbb), [`8298cf8a9`](https://github.com/firebase/firebase-js-sdk/commit/8298cf8a9343dbba6c628d64941dfbe5d17c44aa), [`a777385d6`](https://github.com/firebase/firebase-js-sdk/commit/a777385d67653cdcc3b839149dde867f32b48369), [`dc6b447ba`](https://github.com/firebase/firebase-js-sdk/commit/dc6b447bac4e899a0c4741ec18bf19e2ae66731a)]:
  - @firebase/app@0.7.11
  - @firebase/firestore@3.4.1
  - @firebase/firestore-compat@0.1.10
  - @firebase/auth@0.19.4
  - @firebase/app-compat@0.1.12
  - @firebase/auth-compat@0.2.4

## 9.6.0

### Minor Changes

- [`086df7c7e`](https://github.com/firebase/firebase-js-sdk/commit/086df7c7e0299cedd9f3cff9080f46ca25cab7cd) [#5634](https://github.com/firebase/firebase-js-sdk/pull/5634) - AppCheck integration for Firestore

### Patch Changes

- Updated dependencies [[`086df7c7e`](https://github.com/firebase/firebase-js-sdk/commit/086df7c7e0299cedd9f3cff9080f46ca25cab7cd)]:
  - @firebase/app@0.7.10
  - @firebase/firestore@3.4.0
  - @firebase/app-compat@0.1.11
  - @firebase/firestore-compat@0.1.9

## 9.5.0

### Minor Changes

- [`e34e98e73`](https://github.com/firebase/firebase-js-sdk/commit/e34e98e73a72f77ee87d9005d6728402129deda9) [#5672](https://github.com/firebase/firebase-js-sdk/pull/5672) (fixes [#76](https://github.com/firebase/firebase-js-sdk/issues/76)) - Adds `getBytes()`, `getStream()` and `getBlob()`, which allow direct file downloads from the SDK.

### Patch Changes

- Updated dependencies [[`e34e98e73`](https://github.com/firebase/firebase-js-sdk/commit/e34e98e73a72f77ee87d9005d6728402129deda9), [`0394cc97b`](https://github.com/firebase/firebase-js-sdk/commit/0394cc97b98f04dae87b718655eb46174275ebc2), [`6f0049e66`](https://github.com/firebase/firebase-js-sdk/commit/6f0049e66064809ae990a2d9461e28b2d6d08d19), [`7a5bc84bd`](https://github.com/firebase/firebase-js-sdk/commit/7a5bc84bd84a8d1b422204f30a59f06d5b60f1bd), [`ce39a1a07`](https://github.com/firebase/firebase-js-sdk/commit/ce39a1a07e8710e43cc66d9e7db882f185211a9a)]:
  - @firebase/app@0.7.9
  - @firebase/storage@0.9.0
  - @firebase/storage-compat@0.1.8
  - @firebase/app-check@0.5.2
  - @firebase/firestore@3.3.1
  - @firebase/app-compat@0.1.10
  - @firebase/app-check-compat@0.2.2
  - @firebase/firestore-compat@0.1.8

## 9.4.1

### Patch Changes

- Updated dependencies [[`3b338dbd8`](https://github.com/firebase/firebase-js-sdk/commit/3b338dbd8cdfdc73267cd052b1852a1358b05eaf), [`1583a8202`](https://github.com/firebase/firebase-js-sdk/commit/1583a82022bfd404e94f28d1786e596d6b5a9f43), [`e0fe2b668`](https://github.com/firebase/firebase-js-sdk/commit/e0fe2b668b64b64d842988c2c147d3de66148f48)]:
  - @firebase/app@0.7.8
  - @firebase/functions@0.7.6
  - @firebase/auth@0.19.3
  - @firebase/storage@0.8.7
  - @firebase/app-compat@0.1.9
  - @firebase/functions-compat@0.1.7
  - @firebase/auth-compat@0.2.3
  - @firebase/storage-compat@0.1.7

## 9.4.0

### Minor Changes

- [`532b3cd93`](https://github.com/firebase/firebase-js-sdk/commit/532b3cd939c5a2c13987a21e38a0a121c5dfca04) [#5675](https://github.com/firebase/firebase-js-sdk/pull/5675) (fixes [#5661](https://github.com/firebase/firebase-js-sdk/issues/5661)) - Expanded `Firestore.WithFieldValue<T>` to include `T`. This allows developers to delegate `WithFieldValue<T>` inside wrappers of type `T` to avoid exposing Firebase types beyond Firebase-specific logic.

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`532b3cd93`](https://github.com/firebase/firebase-js-sdk/commit/532b3cd939c5a2c13987a21e38a0a121c5dfca04), [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a), [`dbd54f7c9`](https://github.com/firebase/firebase-js-sdk/commit/dbd54f7c9ef0b5d78d491e26d816084a478bdf04)]:
  - @firebase/firestore@3.3.0
  - @firebase/analytics-compat@0.1.5
  - @firebase/analytics@0.7.4
  - @firebase/app-check-compat@0.2.1
  - @firebase/app-check@0.5.1
  - @firebase/app-compat@0.1.8
  - @firebase/app@0.7.7
  - @firebase/auth-compat@0.2.2
  - @firebase/auth@0.19.2
  - @firebase/database-compat@0.1.4
  - @firebase/database@0.12.4
  - @firebase/firestore-compat@0.1.7
  - @firebase/functions-compat@0.1.6
  - @firebase/functions@0.7.5
  - @firebase/installations@0.5.4
  - @firebase/messaging-compat@0.1.4
  - @firebase/messaging@0.9.4
  - @firebase/performance-compat@0.1.4
  - @firebase/performance@0.5.4
  - @firebase/remote-config-compat@0.1.4
  - @firebase/remote-config@0.3.3
  - @firebase/storage-compat@0.1.6
  - @firebase/storage@0.8.6
  - @firebase/util@1.4.2

## 9.3.0

### Minor Changes

- [`61604979c`](https://github.com/firebase/firebase-js-sdk/commit/61604979cb35647610ea385a6ba0ca67cb03f5d1) [#5595](https://github.com/firebase/firebase-js-sdk/pull/5595) - Add ReCAPTCHA Enterprise as an attestation option for App Check.

### Patch Changes

- Updated dependencies [[`31bd6f27f`](https://github.com/firebase/firebase-js-sdk/commit/31bd6f27f965a561f814bad1110a43849a6a9cbf), [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684), [`61604979c`](https://github.com/firebase/firebase-js-sdk/commit/61604979cb35647610ea385a6ba0ca67cb03f5d1), [`0765b5e19`](https://github.com/firebase/firebase-js-sdk/commit/0765b5e19c3e949bb33233ee52c8e33f01418e54)]:
  - @firebase/auth-compat@0.2.1
  - @firebase/auth@0.19.1
  - @firebase/analytics@0.7.3
  - @firebase/analytics-compat@0.1.4
  - @firebase/app@0.7.6
  - @firebase/app-check@0.5.0
  - @firebase/app-check-compat@0.2.0
  - @firebase/app-compat@0.1.7
  - @firebase/database@0.12.3
  - @firebase/database-compat@0.1.3
  - @firebase/firestore-compat@0.1.6
  - @firebase/functions@0.7.4
  - @firebase/functions-compat@0.1.5
  - @firebase/installations@0.5.3
  - @firebase/messaging@0.9.3
  - @firebase/messaging-compat@0.1.3
  - @firebase/performance@0.5.3
  - @firebase/performance-compat@0.1.3
  - @firebase/remote-config@0.3.2
  - @firebase/remote-config-compat@0.1.3
  - @firebase/storage@0.8.5
  - @firebase/storage-compat@0.1.5
  - @firebase/util@1.4.1
  - @firebase/firestore@3.2.1

## 9.2.0

### Minor Changes

- [`4d3640481`](https://github.com/firebase/firebase-js-sdk/commit/4d36404812a7ca24ced5e1aabf6d8aa03de4e08a) [#5532](https://github.com/firebase/firebase-js-sdk/pull/5532) (fixes [#5499](https://github.com/firebase/firebase-js-sdk/issues/5499)) - Fix exports field to also point to Node ESM builds. This change requires Node.js version 10+.

* [`b6f30c24f`](https://github.com/firebase/firebase-js-sdk/commit/b6f30c24fdf096ac4e8bdba32b9c1380903a7507) [#5617](https://github.com/firebase/firebase-js-sdk/pull/5617) (fixes [#5610](https://github.com/firebase/firebase-js-sdk/issues/5610)) - Fix behavior on subsequent calls to `getRedirectResult()`

### Patch Changes

- [`f0f6d74b5`](https://github.com/firebase/firebase-js-sdk/commit/f0f6d74b58312f7e577743e58abb030ffe38c295) [#5664](https://github.com/firebase/firebase-js-sdk/pull/5664) (fixes [#5644](https://github.com/firebase/firebase-js-sdk/issues/5644)) - Fix compatability layer errors that were being thrown in Safari

- Updated dependencies [[`4d3640481`](https://github.com/firebase/firebase-js-sdk/commit/4d36404812a7ca24ced5e1aabf6d8aa03de4e08a), [`b6f30c24f`](https://github.com/firebase/firebase-js-sdk/commit/b6f30c24fdf096ac4e8bdba32b9c1380903a7507), [`69ff8eb54`](https://github.com/firebase/firebase-js-sdk/commit/69ff8eb549e49de51cae11a04bce023bb6e1fc02), [`2429ac105`](https://github.com/firebase/firebase-js-sdk/commit/2429ac105b0aeb15eb8c362665448c209887bada), [`4594d3fd6`](https://github.com/firebase/firebase-js-sdk/commit/4594d3fd6c7f7680b877aa2017ba35084ef6af96), [`6dacc2400`](https://github.com/firebase/firebase-js-sdk/commit/6dacc2400fdcf4432ed1977ca1eb148da6db3fc5), [`f48527617`](https://github.com/firebase/firebase-js-sdk/commit/f485276173ac0f6fb212328d00334892f4b33a9a), [`c75bbe957`](https://github.com/firebase/firebase-js-sdk/commit/c75bbe9574133ce6d1487a601c7acb4204e417aa)]:
  - @firebase/firestore@3.2.0
  - @firebase/app@0.7.5
  - @firebase/auth-compat@0.2.0
  - @firebase/auth@0.19.0
  - @firebase/firestore-compat@0.1.5
  - @firebase/app-compat@0.1.6

## 9.1.3

### Patch Changes

- Updated dependencies [[`a7e00b9eb`](https://github.com/firebase/firebase-js-sdk/commit/a7e00b9ebbb05b094a8bf620790146e750463c12), [`352cc2647`](https://github.com/firebase/firebase-js-sdk/commit/352cc26476a0c249f89d19eb371ecdcbbd067e5f), [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f)]:
  - @firebase/storage@0.8.4
  - @firebase/database-compat@0.1.2
  - @firebase/firestore-compat@0.1.4
  - @firebase/storage-compat@0.1.4
  - @firebase/analytics@0.7.2
  - @firebase/app@0.7.4
  - @firebase/auth@0.18.3
  - @firebase/database@0.12.2
  - @firebase/firestore@3.1.1
  - @firebase/functions@0.7.3
  - @firebase/installations@0.5.2
  - @firebase/messaging@0.9.2
  - @firebase/performance@0.5.2
  - @firebase/remote-config@0.3.1
  - @firebase/analytics-compat@0.1.3
  - @firebase/app-compat@0.1.5
  - @firebase/auth-compat@0.1.6
  - @firebase/functions-compat@0.1.4
  - @firebase/messaging-compat@0.1.2
  - @firebase/performance-compat@0.1.2
  - @firebase/remote-config-compat@0.1.2

## 9.1.2

### Patch Changes

- [`3e920c888`](https://github.com/firebase/firebase-js-sdk/commit/3e920c8880ed72e86c85f64b23836d95a3246491) [#5573](https://github.com/firebase/firebase-js-sdk/pull/5573) - Fixed App Check compat package to correctly export and handle `ReCaptchaV3Provider` and `CustomProvider` classes.

- Updated dependencies [[`a4e770e58`](https://github.com/firebase/firebase-js-sdk/commit/a4e770e58d03d75a63f1ed7845589b863573b76e), [`1b0e7af13`](https://github.com/firebase/firebase-js-sdk/commit/1b0e7af130c59b867e84b3f2615248fedad5b83d), [`e1d551ddb`](https://github.com/firebase/firebase-js-sdk/commit/e1d551ddb29db0f1fdf25c986cfcae6804bc8e79), [`f7d8324a1`](https://github.com/firebase/firebase-js-sdk/commit/f7d8324a188f013f7875cf6c35fc4beb2c78c0ae), [`e456d00a7`](https://github.com/firebase/firebase-js-sdk/commit/e456d00a7d054b2e95476562a087f2b12301e800), [`3e920c888`](https://github.com/firebase/firebase-js-sdk/commit/3e920c8880ed72e86c85f64b23836d95a3246491)]:
  - @firebase/app@0.7.3
  - @firebase/app-check@0.4.2
  - @firebase/auth@0.18.2
  - @firebase/auth-compat@0.1.5
  - @firebase/app-check-compat@0.1.3
  - @firebase/app-compat@0.1.4

## 9.1.1

### Patch Changes

- Updated dependencies [[`49b0406ab`](https://github.com/firebase/firebase-js-sdk/commit/49b0406abb9b211c5b75325b0383539ac03358d1)]:
  - @firebase/app@0.7.2
  - @firebase/auth@0.18.1
  - @firebase/app-compat@0.1.3
  - @firebase/auth-compat@0.1.4

## 9.1.0

### Minor Changes

- [`f90c1d081`](https://github.com/firebase/firebase-js-sdk/commit/f90c1d081ee6be472b3a372e1f01f7a5cace3155) [#3623](https://github.com/firebase/firebase-js-sdk/pull/3623) - Issue 2393 - Add environment check to Remote-Config Module

### Patch Changes

- Updated dependencies [[`dfe65ff9b`](https://github.com/firebase/firebase-js-sdk/commit/dfe65ff9bfa66d318d45e2a666e302867ae53a01), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422), [`f90c1d081`](https://github.com/firebase/firebase-js-sdk/commit/f90c1d081ee6be472b3a372e1f01f7a5cace3155), [`08c098211`](https://github.com/firebase/firebase-js-sdk/commit/08c098211f44a79a5b8d30c6b4222d560ff522a3), [`f78ceca1c`](https://github.com/firebase/firebase-js-sdk/commit/f78ceca1cf9198f5d371320e8814c859c261cf67), [`e62d02e52`](https://github.com/firebase/firebase-js-sdk/commit/e62d02e52e50fe53b3db90e9641df25a42742b15), [`a5d87bc5c`](https://github.com/firebase/firebase-js-sdk/commit/a5d87bc5c5d6360d5fa2386fe351937463bc45b8), [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422), [`07b88e6e8`](https://github.com/firebase/firebase-js-sdk/commit/07b88e6e80f60525c66bf330d28160dbef2d0a2c), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422), [`4d2a54fb0`](https://github.com/firebase/firebase-js-sdk/commit/4d2a54fb0611ab1987ad415c265440b9bbbc28c6), [`c2362214a`](https://github.com/firebase/firebase-js-sdk/commit/c2362214ad6154ce013d3815a6f1ccd061679f66), [`b79bd33e4`](https://github.com/firebase/firebase-js-sdk/commit/b79bd33e4d3fe6c051b29a85d5141fcb8dcc8d2d), [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39)]:
  - @firebase/database-compat@0.1.1
  - @firebase/database@0.12.1
  - @firebase/app-check@0.4.1
  - @firebase/app-check-compat@0.1.2
  - @firebase/remote-config@0.3.0
  - @firebase/firestore-compat@0.1.3
  - @firebase/firestore@3.1.0
  - @firebase/auth@0.18.0
  - @firebase/util@1.4.0
  - @firebase/performance@0.5.1
  - @firebase/performance-compat@0.1.1
  - @firebase/messaging@0.9.1
  - @firebase/analytics@0.7.1
  - @firebase/messaging-compat@0.1.1
  - @firebase/analytics-compat@0.1.2
  - @firebase/remote-config-compat@0.1.1
  - @firebase/auth-compat@0.1.3
  - @firebase/storage@0.8.3
  - @firebase/app@0.7.1
  - @firebase/app-compat@0.1.2
  - @firebase/functions@0.7.2
  - @firebase/functions-compat@0.1.3
  - @firebase/installations@0.5.1
  - @firebase/storage-compat@0.1.3

## 9.0.2

### Patch Changes

- Updated dependencies [[`08ec55d6d`](https://github.com/firebase/firebase-js-sdk/commit/08ec55d6dfcc85207fbdcdde77d6508f27998603), [`8180a2b77`](https://github.com/firebase/firebase-js-sdk/commit/8180a2b77d331c4d01a000e35f51dc61af660eb7), [`b8462f248`](https://github.com/firebase/firebase-js-sdk/commit/b8462f2489fb6f37691b136c9a5d453207dccc06), [`271303f3c`](https://github.com/firebase/firebase-js-sdk/commit/271303f3ca6fa47c646177a41d7a3e3f31e1d296), [`bf5772f64`](https://github.com/firebase/firebase-js-sdk/commit/bf5772f645207c24f3218914d27fdbe4e76584a2), [`dca28a10d`](https://github.com/firebase/firebase-js-sdk/commit/dca28a10dac4409c84d5a991094f7b5a4f3e5c7f), [`deda8cd85`](https://github.com/firebase/firebase-js-sdk/commit/deda8cd85e365c36b657dbe8a233b16bcf751ea7), [`66d4a1e5d`](https://github.com/firebase/firebase-js-sdk/commit/66d4a1e5d8e1b8b952e21fc3190ec7076d8161ea)]:
  - @firebase/auth@0.17.2
  - @firebase/firestore@3.0.2
  - @firebase/functions@0.7.1
  - @firebase/storage@0.8.2
  - @firebase/auth-compat@0.1.2
  - @firebase/firestore-compat@0.1.2
  - @firebase/functions-compat@0.1.2
  - @firebase/storage-compat@0.1.2

## 9.0.1

### Patch Changes

- Updated dependencies [[`66596f3f8`](https://github.com/firebase/firebase-js-sdk/commit/66596f3f8c747158bf30b62d8f579f7eecf97081), [`cd15df0d1`](https://github.com/firebase/firebase-js-sdk/commit/cd15df0d1f51110f448e4284244b06be8d37f1c3), [`cd15df0d1`](https://github.com/firebase/firebase-js-sdk/commit/cd15df0d1f51110f448e4284244b06be8d37f1c3), [`1b33fda40`](https://github.com/firebase/firebase-js-sdk/commit/1b33fda40ddc48e9ed28e94607bf100159f5b80e), [`6163bb282`](https://github.com/firebase/firebase-js-sdk/commit/6163bb282b4e3b6fe5f405c3b3e35d5691d41677)]:
  - @firebase/auth@0.17.1
  - @firebase/analytics-compat@0.1.1
  - @firebase/app-check-compat@0.1.1
  - @firebase/app-compat@0.1.1
  - @firebase/functions-compat@0.1.1
  - @firebase/firestore@3.0.1
  - @firebase/storage@0.8.1
  - @firebase/auth-compat@0.1.1
  - @firebase/firestore-compat@0.1.1
  - @firebase/storage-compat@0.1.1

## 9.0.0

### Major Changes

- [`5bc6afb75`](https://github.com/firebase/firebase-js-sdk/commit/5bc6afb75b5267bad5940c32458c315e5394321d) [#5268](https://github.com/firebase/firebase-js-sdk/pull/5268) (fixes [#4277](https://github.com/firebase/firebase-js-sdk/issues/4277)) - This change contains multiple quality-of-life improvements when using the `FirestoreDataConverter` in `@firebase/firestore/lite` and `@firebase/firestore`:
  - Support for passing in `FieldValue` property values when using a converter (via `WithFieldValue<T>` and `PartialWithFieldValue<T>`).
  - Support for omitting properties in nested fields when performing a set operation with `{merge: true}` with a converter (via `PartialWithFieldValue<T>`).
  - Support for typed update operations when using a converter (via the newly typed `UpdateData`). Improperly typed fields in
    update operations on typed document references will no longer compile.

* [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`5bc6afb75`](https://github.com/firebase/firebase-js-sdk/commit/5bc6afb75b5267bad5940c32458c315e5394321d), [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - @firebase/firestore@3.0.0
  - @firebase/firestore-compat@0.1.0
  - @firebase/analytics@0.7.0
  - @firebase/analytics-compat@0.1.0
  - @firebase/app@0.7.0
  - @firebase/app-check@0.4.0
  - @firebase/app-check-compat@0.1.0
  - @firebase/app-compat@0.1.0
  - @firebase/app-types@0.7.0
  - @firebase/auth@0.17.0
  - @firebase/auth-compat@0.1.0
  - @firebase/database@0.12.0
  - @firebase/database-compat@0.1.0
  - @firebase/functions@0.7.0
  - @firebase/functions-compat@0.1.0
  - @firebase/installations@0.5.0
  - @firebase/messaging@0.9.0
  - @firebase/messaging-compat@0.1.0
  - @firebase/performance@0.5.0
  - @firebase/performance-compat@0.1.0
  - @firebase/remote-config@0.2.0
  - @firebase/remote-config-compat@0.1.0
  - @firebase/storage@0.8.0
  - @firebase/storage-compat@0.1.0

## 8.10.0

### Minor Changes

- [`d0710d500`](https://github.com/firebase/firebase-js-sdk/commit/d0710d5006a07318213163127051eebf0c339383) [#5139](https://github.com/firebase/firebase-js-sdk/pull/5139) - Allows retrieval of `messageId` from `MessagePayload`.

* [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131) [#5282](https://github.com/firebase/firebase-js-sdk/pull/5282) - Implement mockUserToken for Storage and fix JWT format bugs.

### Patch Changes

- Updated dependencies [[`fbb32e7bf`](https://github.com/firebase/firebase-js-sdk/commit/fbb32e7bff32942bea16385fc387b8c22952ed4d), [`d0710d500`](https://github.com/firebase/firebase-js-sdk/commit/d0710d5006a07318213163127051eebf0c339383), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131), [`f825b1d83`](https://github.com/firebase/firebase-js-sdk/commit/f825b1d83228747e404aaefd9f3948d12257d0fc)]:
  - @firebase/storage@0.7.0
  - @firebase/messaging@0.8.0
  - @firebase/database@0.11.0
  - @firebase/firestore@2.4.0
  - @firebase/util@1.3.0
  - @firebase/functions@0.6.15
  - @firebase/analytics@0.6.18
  - @firebase/app@0.6.30
  - @firebase/app-check@0.3.2
  - @firebase/installations@0.4.32
  - @firebase/performance@0.4.18
  - @firebase/remote-config@0.1.43

## 8.9.1

### Patch Changes

- [`f1027e3c2`](https://github.com/firebase/firebase-js-sdk/commit/f1027e3c24cab52046766a898c6702860f5ad3f6) [#5261](https://github.com/firebase/firebase-js-sdk/pull/5261) (fixes [#5258](https://github.com/firebase/firebase-js-sdk/issues/5258)) - Fixed argument typings for `activate()`.

- Updated dependencies [[`f1027e3c2`](https://github.com/firebase/firebase-js-sdk/commit/f1027e3c24cab52046766a898c6702860f5ad3f6)]:
  - @firebase/app-check@0.3.1

## 8.9.0

### Minor Changes

- [`8599d9141`](https://github.com/firebase/firebase-js-sdk/commit/8599d91416ae8ac5202742f11cee00666d3360ec) [#4902](https://github.com/firebase/firebase-js-sdk/pull/4902) - Add `RecaptchaV3Provider` and `CustomProvider` classes that can be supplied to `firebase.appCheck().activate()`.

* [`bd50d8310`](https://github.com/firebase/firebase-js-sdk/commit/bd50d83107be3d87064f72800c608abc94ae3456) [#5206](https://github.com/firebase/firebase-js-sdk/pull/5206) - Fix formatting of links in comments and update some event typings to correctly match GA4 specs.

### Patch Changes

- Updated dependencies [[`5bda08eee`](https://github.com/firebase/firebase-js-sdk/commit/5bda08eee4e0c4007b1d858edcbcc8020604d560), [`8599d9141`](https://github.com/firebase/firebase-js-sdk/commit/8599d91416ae8ac5202742f11cee00666d3360ec)]:
  - @firebase/storage@0.6.2
  - @firebase/app-check@0.3.0
  - @firebase/analytics@0.6.17

## 8.8.1

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c), [`3d10d33bc`](https://github.com/firebase/firebase-js-sdk/commit/3d10d33bc167177fecbf86d2a6574af2e4e210f9)]:
  - @firebase/util@1.2.0
  - @firebase/app-types@0.6.3
  - @firebase/analytics@0.6.16
  - @firebase/app@0.6.29
  - @firebase/app-check@0.2.1
  - @firebase/database@0.10.9
  - @firebase/firestore@2.3.10
  - @firebase/installations@0.4.31
  - @firebase/messaging@0.7.15
  - @firebase/performance@0.4.17
  - @firebase/remote-config@0.1.42
  - @firebase/storage@0.6.1
  - @firebase/functions@0.6.14

## 8.8.0

### Minor Changes

- [`b3caa5158`](https://github.com/firebase/firebase-js-sdk/commit/b3caa515846d2bfcf4a95dedff69f08d503cbfc2) [#5149](https://github.com/firebase/firebase-js-sdk/pull/5149) - Add NodeJS support to Cloud Storage for Firebase. This release changes the `main` field in package.json to point to a Node specific build. If you are building a bundle for borwser usage, please make sure that your bundler uses the `browser` field (the default).

* [`02586c975`](https://github.com/firebase/firebase-js-sdk/commit/02586c9754318b01a0051561d2c7c4906059b5af) [#5070](https://github.com/firebase/firebase-js-sdk/pull/5070) - Add `firebase_screen` and `firebase_screen_class` to `logEvent()` overload for `screen_view` events.

### Patch Changes

- [`2cd9d7c39`](https://github.com/firebase/firebase-js-sdk/commit/2cd9d7c394dd0c84f285fbcfa4b0a5d79509451f) [#5147](https://github.com/firebase/firebase-js-sdk/pull/5147) (fixes [#5047](https://github.com/firebase/firebase-js-sdk/issues/5047)) - Fixed an issue that prevented Timestamps from being used via `update()` when connected to the Emulator

- Updated dependencies [[`b3caa5158`](https://github.com/firebase/firebase-js-sdk/commit/b3caa515846d2bfcf4a95dedff69f08d503cbfc2), [`b51be1da3`](https://github.com/firebase/firebase-js-sdk/commit/b51be1da318a8f79ff159bcb8be9797d192519fd), [`2cd9d7c39`](https://github.com/firebase/firebase-js-sdk/commit/2cd9d7c394dd0c84f285fbcfa4b0a5d79509451f), [`fb3e35965`](https://github.com/firebase/firebase-js-sdk/commit/fb3e35965b23f88e318dd877fabade16cdcb6385)]:
  - @firebase/storage@0.6.0
  - @firebase/firestore@2.3.9
  - @firebase/database@0.10.8
  - @firebase/analytics@0.6.15

## 8.7.1

### Patch Changes

- Updated dependencies [[`99414a51c`](https://github.com/firebase/firebase-js-sdk/commit/99414a51ca5cd25f69a96e4c9949ad5b84e3f64e)]:
  - @firebase/database@0.10.7

## 8.7.0

### Minor Changes

- [`870dd5e35`](https://github.com/firebase/firebase-js-sdk/commit/870dd5e3594f5b588bdc2801c60c6d984d1d08cc) [#5033](https://github.com/firebase/firebase-js-sdk/pull/5033) - Added `getToken()` and `onTokenChanged` methods to App Check.

### Patch Changes

- Updated dependencies [[`870dd5e35`](https://github.com/firebase/firebase-js-sdk/commit/870dd5e3594f5b588bdc2801c60c6d984d1d08cc), [`5d007b8fb`](https://github.com/firebase/firebase-js-sdk/commit/5d007b8fb64ac26c2f82704398965e9f3deda58a), [`5d31e2192`](https://github.com/firebase/firebase-js-sdk/commit/5d31e2192d0ea68a768bc7826ad5aa830c2bc36c), [`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/app-check@0.2.0
  - @firebase/auth@0.16.8
  - @firebase/firestore@2.3.8
  - @firebase/storage@0.5.6
  - @firebase/analytics@0.6.14
  - @firebase/app@0.6.28
  - @firebase/database@0.10.6
  - @firebase/functions@0.6.13
  - @firebase/installations@0.4.30
  - @firebase/messaging@0.7.14
  - @firebase/performance@0.4.16
  - @firebase/remote-config@0.1.41

## 8.6.8

### Patch Changes

- Updated dependencies [[`c81cf82fa`](https://github.com/firebase/firebase-js-sdk/commit/c81cf82fac14cbfaebc0e440235c3fb38af22d38)]:
  - @firebase/auth@0.16.7
  - @firebase/storage@0.5.5
  - @firebase/analytics@0.6.13
  - @firebase/app@0.6.27
  - @firebase/app-check@0.1.4
  - @firebase/database@0.10.5
  - @firebase/firestore@2.3.7
  - @firebase/functions@0.6.12
  - @firebase/installations@0.4.29
  - @firebase/messaging@0.7.13
  - @firebase/performance@0.4.15
  - @firebase/remote-config@0.1.40

## 8.6.7

### Patch Changes

- Updated dependencies [[`1d54447ca`](https://github.com/firebase/firebase-js-sdk/commit/1d54447ca928ab50228600858978bb3b341c0507)]:
  - @firebase/app@0.6.26
  - @firebase/firestore@2.3.6

## 8.6.6

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/firestore@2.3.5
  - @firebase/analytics@0.6.12
  - @firebase/app@0.6.25
  - @firebase/app-check@0.1.3
  - @firebase/database@0.10.4
  - @firebase/functions@0.6.11
  - @firebase/installations@0.4.28
  - @firebase/messaging@0.7.12
  - @firebase/performance@0.4.14
  - @firebase/remote-config@0.1.39
  - @firebase/storage@0.5.4

## 8.6.5

### Patch Changes

- Updated dependencies []:
  - @firebase/app@0.6.24
  - @firebase/firestore@2.3.4

## 8.6.4

### Patch Changes

- [`b49345d31`](https://github.com/firebase/firebase-js-sdk/commit/b49345d31cdd3dfd42d65768156818dc09c7fa61) [#4283](https://github.com/firebase/firebase-js-sdk/pull/4283) (fixes [#4235](https://github.com/firebase/firebase-js-sdk/issues/4235)) - set firebase.SDK_VERSION to the latest value

- Updated dependencies [[`92e4e8d29`](https://github.com/firebase/firebase-js-sdk/commit/92e4e8d2996c690837a203a868b0d26bf6e3ad84)]:
  - @firebase/functions@0.6.10
  - @firebase/analytics@0.6.11
  - @firebase/app@0.6.23
  - @firebase/app-check@0.1.2
  - @firebase/database@0.10.3
  - @firebase/firestore@2.3.3
  - @firebase/installations@0.4.27
  - @firebase/messaging@0.7.11
  - @firebase/performance@0.4.13
  - @firebase/remote-config@0.1.38
  - @firebase/storage@0.5.3

## 8.6.3

### Patch Changes

- Updated dependencies [[`169174520`](https://github.com/firebase/firebase-js-sdk/commit/169174520f6451f5741fd50e8957d4097895e97a), [`2a5039ee3`](https://github.com/firebase/firebase-js-sdk/commit/2a5039ee3242fb4109da9dee36ac978d78519334)]:
  - @firebase/firestore@2.3.2
  - @firebase/database@0.10.2

## 8.6.2

### Patch Changes

- Updated dependencies [[`de68cdca2`](https://github.com/firebase/firebase-js-sdk/commit/de68cdca21c6ba5a890807857b529c2187e4adba), [`96a47097f`](https://github.com/firebase/firebase-js-sdk/commit/96a47097f36fa33f16b3f63b8cc72d256710e528), [`997040ace`](https://github.com/firebase/firebase-js-sdk/commit/997040ace70de0891c9dea78b6da89e4886163b9)]:
  - @firebase/auth@0.16.6
  - @firebase/firestore@2.3.1
  - @firebase/functions@0.6.9

## 8.6.1

### Patch Changes

- Updated dependencies [[`60e834739`](https://github.com/firebase/firebase-js-sdk/commit/60e83473940e60f8390b1b0f97cf45a1733f66f0), [`5b202f852`](https://github.com/firebase/firebase-js-sdk/commit/5b202f852ca68b35b06b0ea17e4b6b8c446c651c)]:
  - @firebase/app@0.6.22
  - @firebase/app-check@0.1.1
  - @firebase/database@0.10.1

## 8.6.0

### Minor Changes

- [`81c131abe`](https://github.com/firebase/firebase-js-sdk/commit/81c131abea7001c5933156ff6b0f3925f16ff052) [#4860](https://github.com/firebase/firebase-js-sdk/pull/4860) - Release the Firebase App Check package.

### Patch Changes

- [`cc7207e25`](https://github.com/firebase/firebase-js-sdk/commit/cc7207e25f09870c6c718b8e209e694661676d27) [#4870](https://github.com/firebase/firebase-js-sdk/pull/4870) - Fix database.useEmulator typing.

- Updated dependencies [[`81c131abe`](https://github.com/firebase/firebase-js-sdk/commit/81c131abea7001c5933156ff6b0f3925f16ff052)]:
  - @firebase/app-check@0.1.0

## 8.5.0

### Minor Changes

- [`97f61e6f3`](https://github.com/firebase/firebase-js-sdk/commit/97f61e6f3d24e5b4c92ed248bb531233a94b9eaf) [#4837](https://github.com/firebase/firebase-js-sdk/pull/4837) (fixes [#4715](https://github.com/firebase/firebase-js-sdk/issues/4715)) - Add mockUserToken support for Firestore.

* [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467) [#4792](https://github.com/firebase/firebase-js-sdk/pull/4792) - Add mockUserToken support for database emulator.

### Patch Changes

- Updated dependencies [[`97f61e6f3`](https://github.com/firebase/firebase-js-sdk/commit/97f61e6f3d24e5b4c92ed248bb531233a94b9eaf), [`e123f241c`](https://github.com/firebase/firebase-js-sdk/commit/e123f241c0cf39a983645582c4e42b7a5bff7bd6), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/firestore@2.3.0
  - @firebase/app@0.6.21
  - @firebase/database@0.10.0
  - @firebase/util@1.1.0
  - @firebase/analytics@0.6.10
  - @firebase/functions@0.6.8
  - @firebase/installations@0.4.26
  - @firebase/messaging@0.7.10
  - @firebase/performance@0.4.12
  - @firebase/remote-config@0.1.37
  - @firebase/storage@0.5.2

## 8.4.3

### Patch Changes

- Updated dependencies [[`8d63eacf9`](https://github.com/firebase/firebase-js-sdk/commit/8d63eacf964c6e6b3b8ffe06bf682844ee430fbc), [`d422436d1`](https://github.com/firebase/firebase-js-sdk/commit/d422436d1d83f82aee8028e3a24c8e18d9d7c098)]:
  - @firebase/database@0.9.12

## 8.4.2

### Patch Changes

- Updated dependencies [[`633463e2a`](https://github.com/firebase/firebase-js-sdk/commit/633463e2abfdef7dbb6d9bf5275df21d6a01fcb6), [`c65883680`](https://github.com/firebase/firebase-js-sdk/commit/c658836806e0a5fef11fa61cd68f98960567f31b), [`364e336a0`](https://github.com/firebase/firebase-js-sdk/commit/364e336a04e419d019846d702cf27144aeb8939e), [`191184eb4`](https://github.com/firebase/firebase-js-sdk/commit/191184eb454109bff9198274fc416664b126d7ec)]:
  - @firebase/firestore@2.2.5
  - @firebase/storage@0.5.1
  - @firebase/database@0.9.11
  - @firebase/auth@0.16.5

## 8.4.1

### Patch Changes

- Updated dependencies [[`74fa5064a`](https://github.com/firebase/firebase-js-sdk/commit/74fa5064ae6a183b229975dc858c5ee0f567d0d4)]:
  - @firebase/database@0.9.10

## 8.4.0

### Minor Changes

- [`5ae73656d`](https://github.com/firebase/firebase-js-sdk/commit/5ae73656d976fa724ea6ca86d496e9531c95b29c) [#4346](https://github.com/firebase/firebase-js-sdk/pull/4346) - Add `storage().useEmulator()` method to enable emulator mode for storage, allowing users
  to set a storage emulator host and port.

### Patch Changes

- [`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda) [#4720](https://github.com/firebase/firebase-js-sdk/pull/4720) - Internal changes to Database and Validation APIs.

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda), [`6db185be5`](https://github.com/firebase/firebase-js-sdk/commit/6db185be5ed297ba2a8b6c0a098319131da7b552), [`5ae73656d`](https://github.com/firebase/firebase-js-sdk/commit/5ae73656d976fa724ea6ca86d496e9531c95b29c)]:
  - @firebase/util@1.0.0
  - @firebase/database@0.9.9
  - @firebase/firestore@2.2.4
  - @firebase/storage@0.5.0
  - @firebase/analytics@0.6.9
  - @firebase/app@0.6.20
  - @firebase/installations@0.4.25
  - @firebase/messaging@0.7.9
  - @firebase/performance@0.4.11
  - @firebase/remote-config@0.1.36
  - @firebase/functions@0.6.7

## 8.3.3

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/app-types@0.6.2
  - @firebase/app@0.6.19
  - @firebase/analytics@0.6.8
  - @firebase/database@0.9.8
  - @firebase/firestore@2.2.3
  - @firebase/functions@0.6.6
  - @firebase/installations@0.4.24
  - @firebase/messaging@0.7.8
  - @firebase/performance@0.4.10
  - @firebase/remote-config@0.1.35
  - @firebase/storage@0.4.7

## 8.3.2

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a), [`4cb0945c6`](https://github.com/firebase/firebase-js-sdk/commit/4cb0945c6e7d9ba729d34f893942f039443346aa)]:
  - @firebase/util@0.4.1
  - @firebase/firestore@2.2.2
  - @firebase/analytics@0.6.7
  - @firebase/app@0.6.18
  - @firebase/database@0.9.7
  - @firebase/installations@0.4.23
  - @firebase/messaging@0.7.7
  - @firebase/performance@0.4.9
  - @firebase/remote-config@0.1.34
  - @firebase/storage@0.4.6
  - @firebase/functions@0.6.5

## 8.3.1

### Patch Changes

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/database@0.9.6
  - @firebase/firestore@2.2.1
  - @firebase/functions@0.6.4
  - @firebase/remote-config@0.1.33
  - @firebase/storage@0.4.5
  - @firebase/analytics@0.6.6
  - @firebase/app@0.6.17
  - @firebase/installations@0.4.22
  - @firebase/messaging@0.7.6
  - @firebase/performance@0.4.8

## 8.3.0

### Minor Changes

- [`b6080a857`](https://github.com/firebase/firebase-js-sdk/commit/b6080a857b1b56e10db041e6357acd69154e31fb) [#4577](https://github.com/firebase/firebase-js-sdk/pull/4577) - Added support to remove a FirestoreDataConverter on a Firestore reference by calling `withConverter(null)`

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e), [`b6080a857`](https://github.com/firebase/firebase-js-sdk/commit/b6080a857b1b56e10db041e6357acd69154e31fb)]:
  - @firebase/util@0.4.0
  - @firebase/firestore@2.2.0
  - @firebase/analytics@0.6.5
  - @firebase/app@0.6.16
  - @firebase/database@0.9.5
  - @firebase/installations@0.4.21
  - @firebase/messaging@0.7.5
  - @firebase/performance@0.4.7
  - @firebase/remote-config@0.1.32
  - @firebase/storage@0.4.4
  - @firebase/functions@0.6.3

## 8.2.10

### Patch Changes

- [`d4ba8daa2`](https://github.com/firebase/firebase-js-sdk/commit/d4ba8daa298ec00f1800374e2bc5c6200575a233) [#4469](https://github.com/firebase/firebase-js-sdk/pull/4469) - Change the `eventParams` argument in the signature of `analytics().logEvent()` to be optional.

## 8.2.9

### Patch Changes

- Updated dependencies []:
  - @firebase/analytics@0.6.4
  - @firebase/app@0.6.15
  - @firebase/database@0.9.4
  - @firebase/firestore@2.1.7
  - @firebase/functions@0.6.2
  - @firebase/installations@0.4.20
  - @firebase/messaging@0.7.4
  - @firebase/performance@0.4.6
  - @firebase/remote-config@0.1.31
  - @firebase/storage@0.4.3

## 8.2.8

### Patch Changes

- Updated dependencies [[`74bf52009`](https://github.com/firebase/firebase-js-sdk/commit/74bf52009b291a62deabfd865084d4e0fcacc483)]:
  - @firebase/analytics@0.6.3
  - @firebase/auth@0.16.4

## 8.2.7

### Patch Changes

- [`05614aa86`](https://github.com/firebase/firebase-js-sdk/commit/05614aa86614994b69df154bd6ce34861fae37a5) [#4427](https://github.com/firebase/firebase-js-sdk/pull/4427) - Add `startAfter()` and `endBefore()` to the Realtime Database TypeScript definitions.

- Updated dependencies [[`a718518e9`](https://github.com/firebase/firebase-js-sdk/commit/a718518e935931709669ea2e88f9711143655e61), [`3d0cd6f33`](https://github.com/firebase/firebase-js-sdk/commit/3d0cd6f33127e75e15aec9b6589eea360827df7a), [`318af5471`](https://github.com/firebase/firebase-js-sdk/commit/318af54715dc61a09897b144dd8841fec1abd8a3), [`05614aa86`](https://github.com/firebase/firebase-js-sdk/commit/05614aa86614994b69df154bd6ce34861fae37a5)]:
  - @firebase/firestore@2.1.6
  - @firebase/database@0.9.3

## 8.2.6

### Patch Changes

- Updated dependencies [[`73bb561e1`](https://github.com/firebase/firebase-js-sdk/commit/73bb561e18ea42286a54d28648636bf1ac7fcfe0), [`9533688b1`](https://github.com/firebase/firebase-js-sdk/commit/9533688b1e39e58a550ec0527a0363270d73c5b5), [`0af2bdfc6`](https://github.com/firebase/firebase-js-sdk/commit/0af2bdfc6b8be3f362cd630e2a917c5a070c568e)]:
  - @firebase/auth@0.16.3
  - @firebase/firestore@2.1.5
  - @firebase/database@0.9.2

## 8.2.5

### Patch Changes

- Updated dependencies [[`749c7f3d9`](https://github.com/firebase/firebase-js-sdk/commit/749c7f3d985f978cd2a204cbc28c3fff09458b5b), [`04a0fea9e`](https://github.com/firebase/firebase-js-sdk/commit/04a0fea9ef291a7da244665289a1aed32e4e7a3b)]:
  - @firebase/app@0.6.14
  - @firebase/firestore@2.1.4
  - @firebase/database@0.9.1

## 8.2.4

### Patch Changes

- [`92a7f4345`](https://github.com/firebase/firebase-js-sdk/commit/92a7f434536051bedd00bc1be7e774174378aa7d) [#4280](https://github.com/firebase/firebase-js-sdk/pull/4280) - Add the `useEmulator()` function and `emulatorConfig` to the `firebase` package externs

- Updated dependencies [[`cb835e723`](https://github.com/firebase/firebase-js-sdk/commit/cb835e723fab2a85a4e073a3f09354e3e6520dd1), [`6ac66baa0`](https://github.com/firebase/firebase-js-sdk/commit/6ac66baa0e7ac8dd90a6d6136a020cdd54710df5), [`92a7f4345`](https://github.com/firebase/firebase-js-sdk/commit/92a7f434536051bedd00bc1be7e774174378aa7d)]:
  - @firebase/database@0.9.0
  - @firebase/firestore@2.1.3
  - @firebase/auth@0.16.2

## 8.2.3

### Patch Changes

- Updated dependencies [[`50abe6c4d`](https://github.com/firebase/firebase-js-sdk/commit/50abe6c4d455693ef6a3a3c1bc8ef6ab5b8bd9ea)]:
  - @firebase/database@0.8.3

## 8.2.2

### Patch Changes

- Updated dependencies [[`487f8e1d2`](https://github.com/firebase/firebase-js-sdk/commit/487f8e1d2c6bd1a54305f2b0f148b4985f3cea8e), [`6069b1d6c`](https://github.com/firebase/firebase-js-sdk/commit/6069b1d6c521d05dde821f21bcc7e02913180ae5), [`ba59a0f90`](https://github.com/firebase/firebase-js-sdk/commit/ba59a0f909a1eb59d23b887bba30b6f86d63c931)]:
  - @firebase/database@0.8.2
  - @firebase/firestore@2.1.2

## 8.2.1

### Patch Changes

- Updated dependencies [[`9fd3f5233`](https://github.com/firebase/firebase-js-sdk/commit/9fd3f5233077b45c5101789c427db51835484ce0), [`44b5251d0`](https://github.com/firebase/firebase-js-sdk/commit/44b5251d0527d1aa768959765ff04093a04dd8ab)]:
  - @firebase/auth@0.16.1
  - @firebase/firestore@2.1.1

## 8.2.0

### Minor Changes

- [`b662f8c0a`](https://github.com/firebase/firebase-js-sdk/commit/b662f8c0a9890cbdcf53cce7fe01c2a8a52d3d2d) [#4168](https://github.com/firebase/firebase-js-sdk/pull/4168) - Release Firestore Bundles (pre-packaged Firestore data). For NPM users, this can
  be enabled via an additional import: 'firebase/firestore/bundle'. For CDN usage,
  it is enabled by default.

* [`c9f379cf7`](https://github.com/firebase/firebase-js-sdk/commit/c9f379cf7ef2c5938512a45b63008bbb135926ed) [#4112](https://github.com/firebase/firebase-js-sdk/pull/4112) - Add option to hide banner in auth when using the emulator

### Patch Changes

- [`6f2c7b7aa`](https://github.com/firebase/firebase-js-sdk/commit/6f2c7b7aae72d7be88c7a477f1a5d38bd5e8dfe4) [#3896](https://github.com/firebase/firebase-js-sdk/pull/3896) - Dispatch up to 1000 events for each network request when collecting performance events.

- Updated dependencies [[`b662f8c0a`](https://github.com/firebase/firebase-js-sdk/commit/b662f8c0a9890cbdcf53cce7fe01c2a8a52d3d2d), [`1b5407372`](https://github.com/firebase/firebase-js-sdk/commit/1b54073726db8cefd994492d0cfba7c5f619f14b), [`6f2c7b7aa`](https://github.com/firebase/firebase-js-sdk/commit/6f2c7b7aae72d7be88c7a477f1a5d38bd5e8dfe4), [`c9f379cf7`](https://github.com/firebase/firebase-js-sdk/commit/c9f379cf7ef2c5938512a45b63008bbb135926ed)]:
  - @firebase/firestore@2.1.0
  - @firebase/performance@0.4.5
  - @firebase/auth@0.16.0

## 8.1.2

### Patch Changes

- [`11563b227`](https://github.com/firebase/firebase-js-sdk/commit/11563b227f30c9282c45e4a8128d5679954dcfd1) [#4146](https://github.com/firebase/firebase-js-sdk/pull/4146) - Fix issue with IndexedDB retry logic causing uncaught errors

- Updated dependencies [[`1849b0d0f`](https://github.com/firebase/firebase-js-sdk/commit/1849b0d0f0bbca56e50bea01979d20ada58040dc), [`8993f16b8`](https://github.com/firebase/firebase-js-sdk/commit/8993f16b81b4b386f2ac5195950235a6a43ed9bc), [`11563b227`](https://github.com/firebase/firebase-js-sdk/commit/11563b227f30c9282c45e4a8128d5679954dcfd1)]:
  - @firebase/firestore@2.0.5
  - @firebase/auth@0.15.3

## 8.1.1

### Patch Changes

- [`4f6313262`](https://github.com/firebase/firebase-js-sdk/commit/4f63132622fa46ca7373ab93440c76bcb1822620) [#4096](https://github.com/firebase/firebase-js-sdk/pull/4096) - Add the missing type definition for 'Query.get()' for RTDB

- Updated dependencies [[`9822e125c`](https://github.com/firebase/firebase-js-sdk/commit/9822e125c399ae7271d4a9077f82b184a44526e4)]:
  - @firebase/firestore@2.0.4
  - @firebase/database@0.8.1

## 8.1.0

### Minor Changes

- [`34973cde2`](https://github.com/firebase/firebase-js-sdk/commit/34973cde218e570baccd235d5bb6c6146559f80b) [#3812](https://github.com/firebase/firebase-js-sdk/pull/3812) - Add a `get` method for database queries that returns server result when connected

### Patch Changes

- Updated dependencies [[`6c6c49ad6`](https://github.com/firebase/firebase-js-sdk/commit/6c6c49ad6b3c3d66e9ecb8397c4ac39bea256e80), [`e0bf3f70b`](https://github.com/firebase/firebase-js-sdk/commit/e0bf3f70bf82f3587e60ab4484fe37d01cea0051), [`34973cde2`](https://github.com/firebase/firebase-js-sdk/commit/34973cde218e570baccd235d5bb6c6146559f80b)]:
  - @firebase/firestore@2.0.3
  - @firebase/database@0.8.0

## 8.0.2

### Patch Changes

- Updated dependencies [[`d2adf4e3e`](https://github.com/firebase/firebase-js-sdk/commit/d2adf4e3e69da3a4312828137f9721ea84b87fe2), [`c2b215c19`](https://github.com/firebase/firebase-js-sdk/commit/c2b215c1950b2f75abb6a8dd58544a79bda968f6), [`6dffdf2eb`](https://github.com/firebase/firebase-js-sdk/commit/6dffdf2eb1323ec9047af4ed78302a68f7dacce3), [`484e90a1d`](https://github.com/firebase/firebase-js-sdk/commit/484e90a1d8f63e04268ff5bce4e3e0873c56c8e1), [`f9dc50e35`](https://github.com/firebase/firebase-js-sdk/commit/f9dc50e3520d50b70eecd28b81887e0053f9f636)]:
  - @firebase/firestore@2.0.2
  - @firebase/auth@0.15.2
  - @firebase/storage@0.4.2

## 8.0.1

### Patch Changes

- Updated dependencies [[`54a46f89c`](https://github.com/firebase/firebase-js-sdk/commit/54a46f89c1c45435c76412fa2ed296e986c2f6ab), [`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada), [`007ddd1eb`](https://github.com/firebase/firebase-js-sdk/commit/007ddd1eb6be0a66df7b1c3264d8dff8857d8399)]:
  - @firebase/messaging@0.7.3
  - @firebase/util@0.3.4
  - @firebase/firestore@2.0.1
  - @firebase/functions@0.6.1
  - @firebase/analytics@0.6.2
  - @firebase/app@0.6.13
  - @firebase/database@0.7.1
  - @firebase/installations@0.4.19
  - @firebase/performance@0.4.4
  - @firebase/remote-config@0.1.30
  - @firebase/storage@0.4.1

## 8.0.0

### Major Changes

- [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487) [#3932](https://github.com/firebase/firebase-js-sdk/pull/3932) - Point browser field to esm build. Now you need to use default import instead of namespace import to import firebase.

  Before this change

  ```
  import * as firebase from 'firebase/app';
  ```

  After this change

  ```
  import firebase from 'firebase/app';
  ```

* [`8939aeca0`](https://github.com/firebase/firebase-js-sdk/commit/8939aeca02921f9eacf1badb1068de22f670293e) [#3944](https://github.com/firebase/firebase-js-sdk/pull/3944) - Removed the undocumented `Firestore.logLevel` property.

- [`344bd8856`](https://github.com/firebase/firebase-js-sdk/commit/344bd88566e2c42fd7ee92f28bb0f784629b48ee) [#3943](https://github.com/firebase/firebase-js-sdk/pull/3943) - Removed depreacted `experimentalTabSynchronization` settings. To enable multi-tab sychronization, use `synchronizeTabs` instead.

* [`4b540f91d`](https://github.com/firebase/firebase-js-sdk/commit/4b540f91dbad217e8ec04b382b4c724308cb3df1) [#3939](https://github.com/firebase/firebase-js-sdk/pull/3939) - This releases removes all input validation. Please use our TypeScript types to validate API usage.

- [`ffef32e38`](https://github.com/firebase/firebase-js-sdk/commit/ffef32e3837d3ee1098129b237e7a6e2e738182d) [#3897](https://github.com/firebase/firebase-js-sdk/pull/3897) (fixes [#3879](https://github.com/firebase/firebase-js-sdk/issues/3879)) - Removed the `timestampsInSnapshots` option from `FirestoreSettings`. Now, Firestore always returns `Timestamp` values for all timestamp values.

* [`b247ffa76`](https://github.com/firebase/firebase-js-sdk/commit/b247ffa760aec1636de6cfc78851f97a840181ae) [#3967](https://github.com/firebase/firebase-js-sdk/pull/3967) - This releases removes all input validation. Please use our TypeScript types to validate API usage.

### Minor Changes

- [`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c) [#3904](https://github.com/firebase/firebase-js-sdk/pull/3904) - Add a useEmulator(host, port) method to Realtime Database

* [`79b049375`](https://github.com/firebase/firebase-js-sdk/commit/79b04937537b90422e051086112f6b43c2880cdb) [#3909](https://github.com/firebase/firebase-js-sdk/pull/3909) - Add a useEmulator(host, port) method to Firestore

- [`0322c1bda`](https://github.com/firebase/firebase-js-sdk/commit/0322c1bda93b2885b995e3df2b63b48314546961) [#3906](https://github.com/firebase/firebase-js-sdk/pull/3906) - Add a useEmulator(host, port) method to Cloud Functions

### Patch Changes

- [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5) [#3968](https://github.com/firebase/firebase-js-sdk/pull/3968) - Updated the type definition for `ThenableReference` to only implement `then` and `catch`, which matches the implementation.

- Updated dependencies [[`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c), [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`8939aeca0`](https://github.com/firebase/firebase-js-sdk/commit/8939aeca02921f9eacf1badb1068de22f670293e), [`79b049375`](https://github.com/firebase/firebase-js-sdk/commit/79b04937537b90422e051086112f6b43c2880cdb), [`344bd8856`](https://github.com/firebase/firebase-js-sdk/commit/344bd88566e2c42fd7ee92f28bb0f784629b48ee), [`0322c1bda`](https://github.com/firebase/firebase-js-sdk/commit/0322c1bda93b2885b995e3df2b63b48314546961), [`4b540f91d`](https://github.com/firebase/firebase-js-sdk/commit/4b540f91dbad217e8ec04b382b4c724308cb3df1), [`ffef32e38`](https://github.com/firebase/firebase-js-sdk/commit/ffef32e3837d3ee1098129b237e7a6e2e738182d), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce), [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5), [`b247ffa76`](https://github.com/firebase/firebase-js-sdk/commit/b247ffa760aec1636de6cfc78851f97a840181ae), [`9719635fe`](https://github.com/firebase/firebase-js-sdk/commit/9719635fe2ecbb5b981076ce4807d0df775b8332)]:
  - @firebase/database@0.7.0
  - @firebase/app@0.6.12
  - @firebase/auth@0.15.1
  - @firebase/firestore@2.0.0
  - @firebase/functions@0.6.0
  - @firebase/performance@0.4.3
  - @firebase/remote-config@0.1.29
  - @firebase/util@0.3.3
  - @firebase/storage@0.4.0
  - @firebase/analytics@0.6.1
  - @firebase/installations@0.4.18
  - @firebase/messaging@0.7.2

## 7.24.0

### Minor Changes

- [`eeb1dfa4f`](https://github.com/firebase/firebase-js-sdk/commit/eeb1dfa4f629dc5cf328e4b4a224369c0670c312) [#3810](https://github.com/firebase/firebase-js-sdk/pull/3810) - Add ability to configure the SDK to communicate with the Firebase Auth emulator.

* [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc) [#3724](https://github.com/firebase/firebase-js-sdk/pull/3724) - Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings. When
  enabled, the SDK's underlying transport (WebChannel) automatically detects if
  long-polling should be used. This is very similar to
  `experimentalForceLongPolling`, but only uses long-polling if required.

### Patch Changes

- Updated dependencies [[`eeb1dfa4f`](https://github.com/firebase/firebase-js-sdk/commit/eeb1dfa4f629dc5cf328e4b4a224369c0670c312), [`916770f3c`](https://github.com/firebase/firebase-js-sdk/commit/916770f3cfc0ca9eae92fbf33558b7175cf2cf78), [`2bea0a367`](https://github.com/firebase/firebase-js-sdk/commit/2bea0a367da8de06bae29e1459b7cbe3cdfde540), [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc)]:
  - @firebase/auth@0.15.0
  - @firebase/firestore@1.18.0

## 7.23.0

### Minor Changes

- [`d4db75ff8`](https://github.com/firebase/firebase-js-sdk/commit/d4db75ff81388430489bd561ac2247fe9e0b6eb5) [#3836](https://github.com/firebase/firebase-js-sdk/pull/3836) (fixes [#3573](https://github.com/firebase/firebase-js-sdk/issues/3573)) - Analytics now warns instead of throwing if it detects a browser environment where analytics does not work.

### Patch Changes

- [`48b0b0f7c`](https://github.com/firebase/firebase-js-sdk/commit/48b0b0f7c9137652f438cf04395debddeb3711d0) [#3850](https://github.com/firebase/firebase-js-sdk/pull/3850) - Moved `loggingEnabled` check to wait until performance initialization finishes, thus avoid dropping custom traces right after getting `performance` object.

* [`8728e1a0f`](https://github.com/firebase/firebase-js-sdk/commit/8728e1a0fc9027a21e3b77e4a058a7e8513a4646) [#3866](https://github.com/firebase/firebase-js-sdk/pull/3866) - Throws exception when startTime or duration is not positive value in `trace.record()` API.

* Updated dependencies [[`48b0b0f7c`](https://github.com/firebase/firebase-js-sdk/commit/48b0b0f7c9137652f438cf04395debddeb3711d0), [`a10c18f89`](https://github.com/firebase/firebase-js-sdk/commit/a10c18f8996fc35942779f5fea5690ae5d102bb0), [`d4db75ff8`](https://github.com/firebase/firebase-js-sdk/commit/d4db75ff81388430489bd561ac2247fe9e0b6eb5), [`8728e1a0f`](https://github.com/firebase/firebase-js-sdk/commit/8728e1a0fc9027a21e3b77e4a058a7e8513a4646)]:
  - @firebase/performance@0.4.2
  - @firebase/firestore@1.17.3
  - @firebase/analytics@0.6.0

## 7.22.1

### Patch Changes

- Updated dependencies [[`b6b1fd95c`](https://github.com/firebase/firebase-js-sdk/commit/b6b1fd95cbeeabc38daa574ce7cf0b7dd34cf550)]:
  - @firebase/functions@0.5.1

## 7.22.0

### Minor Changes

- [`a6af7c279`](https://github.com/firebase/firebase-js-sdk/commit/a6af7c27925da47fa62ee3b7b0a267a272c52220) [#3825](https://github.com/firebase/firebase-js-sdk/pull/3825) - Allow setting a custom domain for callable Cloud Functions.

### Patch Changes

- Updated dependencies [[`2be43eadf`](https://github.com/firebase/firebase-js-sdk/commit/2be43eadf756e45da7ad3ae7ba104ac5f0e557fa), [`a6af7c279`](https://github.com/firebase/firebase-js-sdk/commit/a6af7c27925da47fa62ee3b7b0a267a272c52220)]:
  - @firebase/firestore@1.17.2
  - @firebase/functions@0.5.0

## 7.21.1

### Patch Changes

- [`7bf73797d`](https://github.com/firebase/firebase-js-sdk/commit/7bf73797dfe5271b8f380ce4bd2497d8589f05d9) [#3813](https://github.com/firebase/firebase-js-sdk/pull/3813) (fixes [#414](https://github.com/firebase/firebase-js-sdk/issues/414)) - Escape unicodes when generating CDN scripts, so they work correctly in environments that requires UTF-8, for example, in Chrome extension.

- Updated dependencies [[`4dc8817c3`](https://github.com/firebase/firebase-js-sdk/commit/4dc8817c3faf172152a5b1e7778d0ce844510f97), [`16c6ba979`](https://github.com/firebase/firebase-js-sdk/commit/16c6ba9793681f1695f855f22a19a618ceface5f)]:
  - @firebase/firestore@1.17.1

## 7.21.0

### Minor Changes

- [`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9) [#3772](https://github.com/firebase/firebase-js-sdk/pull/3772) - [feature] Added `not-in` and `!=` query operators for use with `.where()`. `not-in` finds documents where a specified field’s value is not in a specified array. `!=` finds documents where a specified field's value does not equal the specified value. Neither query operator will match documents where the specified field is not present.

### Patch Changes

- Updated dependencies [[`3d9b5a595`](https://github.com/firebase/firebase-js-sdk/commit/3d9b5a595813b6c4f7f6ef4e3625ae8856a9fa23), [`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9), [`e81c429ae`](https://github.com/firebase/firebase-js-sdk/commit/e81c429aec43cd4467089bfed68eafafba6e8ee2), [`a8ff3dbaa`](https://github.com/firebase/firebase-js-sdk/commit/a8ff3dbaacd06371e6652a6d639ef2d9bead612b)]:
  - @firebase/database@0.6.13
  - @firebase/firestore@1.17.0

## 7.20.0

### Minor Changes

- [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290) [#2800](https://github.com/firebase/firebase-js-sdk/pull/2800) - Analytics now dynamically fetches the app's Measurement ID from the Dynamic Config backend
  instead of depending on the local Firebase config. It will fall back to any `measurementId`
  value found in the local config if the Dynamic Config fetch fails.

### Patch Changes

- Updated dependencies [[`249d40cb6`](https://github.com/firebase/firebase-js-sdk/commit/249d40cb692366f686a50c06c44ec81e4cae23d7), [`d347c6ca1`](https://github.com/firebase/firebase-js-sdk/commit/d347c6ca1bcb7cd48ab2e4f7954cabafe761aea7), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290), [`dc9892565`](https://github.com/firebase/firebase-js-sdk/commit/dc989256566b8379f475c722370ccbd8f47527c3), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/firestore@1.16.7
  - @firebase/database@0.6.12
  - @firebase/remote-config@0.1.28
  - @firebase/messaging@0.7.1
  - @firebase/util@0.3.2
  - @firebase/analytics@0.5.0
  - @firebase/app@0.6.11
  - @firebase/functions@0.4.51
  - @firebase/installations@0.4.17
  - @firebase/performance@0.4.1
  - @firebase/storage@0.3.43

## 7.19.1

### Patch Changes

- [`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3) [#3464](https://github.com/firebase/firebase-js-sdk/pull/3464) (fixes [#3354](https://github.com/firebase/firebase-js-sdk/issues/3354)) - feat: Added `merge` option to `firestore.settings()`, which merges the provided settings with
  settings from a previous call. This allows adding settings on top of the settings that were applied
  by `@firebase/testing`.
- Updated dependencies [[`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3)]:
  - @firebase/firestore@1.16.6

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
