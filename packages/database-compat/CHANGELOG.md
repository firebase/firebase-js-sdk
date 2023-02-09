# @firebase/database-compat

## 0.3.3

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/database@0.14.3
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3
  - @firebase/database-types@0.10.3

## 0.3.2

### Patch Changes

- [`49ee786f2`](https://github.com/firebase/firebase-js-sdk/commit/49ee786f2b022e65aef45693e1a8b546d889ec10) [#6912](https://github.com/firebase/firebase-js-sdk/pull/6912) (fixes [#4603](https://github.com/firebase/firebase-js-sdk/issues/4603)) - Fixed issue where hostname set by `connectDatabaseEmulator` was being overridden by longpolling response

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- Updated dependencies [[`49ee786f2`](https://github.com/firebase/firebase-js-sdk/commit/49ee786f2b022e65aef45693e1a8b546d889ec10), [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/database@0.14.2
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2
  - @firebase/database-types@0.10.2

## 0.3.1

### Patch Changes

- Updated dependencies [[`d8af08feb`](https://github.com/firebase/firebase-js-sdk/commit/d8af08febfd4507a28bcda38d475b8010ef20f92), [`a4056634a`](https://github.com/firebase/firebase-js-sdk/commit/a4056634a5119dd3f2ca935cae23b90fc99d84ee), [`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/database@0.14.1
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1
  - @firebase/database-types@0.10.1

## 0.3.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- [`37dd6f6f4`](https://github.com/firebase/firebase-js-sdk/commit/37dd6f6f471d9912db3800b9b377080752af8c10) [#6706](https://github.com/firebase/firebase-js-sdk/pull/6706) - Use new wire protocol parameters for startAfter, endBefore.

- Updated dependencies [[`37dd6f6f4`](https://github.com/firebase/firebase-js-sdk/commit/37dd6f6f471d9912db3800b9b377080752af8c10), [`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/database@0.14.0
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0
  - @firebase/database-types@0.10.0
  - @firebase/logger@0.4.0

## 0.2.10

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/database@0.13.10
  - @firebase/database-types@0.9.17
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3

## 0.2.9

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20
  - @firebase/database@0.13.9
  - @firebase/database-types@0.9.16

## 0.2.8

### Patch Changes

- Updated dependencies [[`5aa48d0ab`](https://github.com/firebase/firebase-js-sdk/commit/5aa48d0ab432002ccf49d65bf2ff637e82a2b402), [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/database@0.13.8
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19
  - @firebase/database-types@0.9.15

## 0.2.7

### Patch Changes

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/database@0.13.7
  - @firebase/database-types@0.9.14
  - @firebase/component@0.5.18

## 0.2.6

### Patch Changes

- Updated dependencies [[`f35533594`](https://github.com/firebase/firebase-js-sdk/commit/f355335942b874ba390bcbf3be6de44a3d33dce8)]:
  - @firebase/database@0.13.6

## 0.2.5

### Patch Changes

- [`9f1e3c667`](https://github.com/firebase/firebase-js-sdk/commit/9f1e3c66747126c8e24894d73f7fa27480bec08d) [#6536](https://github.com/firebase/firebase-js-sdk/pull/6536) - Revert "Updated type of action parameter for DataSnapshot#forEach"

* [`fcd4b8ac3`](https://github.com/firebase/firebase-js-sdk/commit/fcd4b8ac36636a60d83cd3370969ff9192f9e6ad) [#6508](https://github.com/firebase/firebase-js-sdk/pull/6508) - Fixed faulty transaction bug causing filtered index queries to override default queries.

* Updated dependencies [[`9f1e3c667`](https://github.com/firebase/firebase-js-sdk/commit/9f1e3c66747126c8e24894d73f7fa27480bec08d), [`a5d9e1083`](https://github.com/firebase/firebase-js-sdk/commit/a5d9e10831c2877e9d15c8a33b15557e4251c4de), [`fcd4b8ac3`](https://github.com/firebase/firebase-js-sdk/commit/fcd4b8ac36636a60d83cd3370969ff9192f9e6ad)]:
  - @firebase/database-types@0.9.13
  - @firebase/database@0.13.5

## 0.2.4

### Patch Changes

- [`65838089d`](https://github.com/firebase/firebase-js-sdk/commit/65838089da47965e5e39e58c76a81a74666b215e) [#6374](https://github.com/firebase/firebase-js-sdk/pull/6374) (fixes [#6368](https://github.com/firebase/firebase-js-sdk/issues/6368)) - Updated type of action parameter for DataSnapshot#forEach

- Updated dependencies [[`65838089d`](https://github.com/firebase/firebase-js-sdk/commit/65838089da47965e5e39e58c76a81a74666b215e)]:
  - @firebase/database@0.13.4
  - @firebase/database-types@0.9.12

## 0.2.3

### Patch Changes

- Updated dependencies [[`c187446a2`](https://github.com/firebase/firebase-js-sdk/commit/c187446a202d881f55800be167cdb37b4d0e4a13), [`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf), [`6a8be1337`](https://github.com/firebase/firebase-js-sdk/commit/6a8be1337f19a49db40e0c757f571f42b5b4d494)]:
  - @firebase/database@0.13.3
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17
  - @firebase/database-types@0.9.11

## 0.2.2

### Patch Changes

- Updated dependencies [[`578dc5836`](https://github.com/firebase/firebase-js-sdk/commit/578dc58365c6c71d8ad01dd8b9dbe829e76de068), [`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/database@0.13.2
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16
  - @firebase/database-types@0.9.10

## 0.2.1

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

* [`497d34c84`](https://github.com/firebase/firebase-js-sdk/commit/497d34c8472a19cb8baca56985c98346e5a4727d) [#6319](https://github.com/firebase/firebase-js-sdk/pull/6319) - Remove app-compat from peerDependencies to avoid npm install warning in firebase-admin.

* Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/database@0.13.1
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1
  - @firebase/database-types@0.9.9

## 0.2.0

### Minor Changes

- [`9c6808fea`](https://github.com/firebase/firebase-js-sdk/commit/9c6808fea231d1ab6de6f6ab548c67b751a12a78) [#6171](https://github.com/firebase/firebase-js-sdk/pull/6171) - Add `forceWebSockets()` and `forceLongPolling()`

### Patch Changes

- Updated dependencies [[`874cdbbcc`](https://github.com/firebase/firebase-js-sdk/commit/874cdbbccbc2bf8f4ee18abe220e87dc52e6a8db), [`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801), [`9c6808fea`](https://github.com/firebase/firebase-js-sdk/commit/9c6808fea231d1ab6de6f6ab548c67b751a12a78)]:
  - @firebase/database@0.13.0
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14
  - @firebase/database-types@0.9.8

## 0.1.8

### Patch Changes

- Updated dependencies [[`1c37b5e96`](https://github.com/firebase/firebase-js-sdk/commit/1c37b5e965978d796c46ff6b9f52051cf6070751), [`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59), [`7a4e65cef`](https://github.com/firebase/firebase-js-sdk/commit/7a4e65cef9468a20fb32dc112aa7113345bc76c5)]:
  - @firebase/database-types@0.9.7
  - @firebase/util@1.5.2
  - @firebase/database@0.12.8
  - @firebase/component@0.5.13

## 0.1.7

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12
  - @firebase/database@0.12.7
  - @firebase/database-types@0.9.6

## 0.1.6

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/database@0.12.6
  - @firebase/component@0.5.11
  - @firebase/database-types@0.9.5

## 0.1.5

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10
  - @firebase/database@0.12.5
  - @firebase/database-types@0.9.4

## 0.1.4

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/database@0.12.4
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2
  - @firebase/database-types@0.9.3

## 0.1.3

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/database@0.12.3
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1
  - @firebase/database-types@0.9.2

## 0.1.2

### Patch Changes

- [`352cc2647`](https://github.com/firebase/firebase-js-sdk/commit/352cc26476a0c249f89d19eb371ecdcbbd067e5f) [#5587](https://github.com/firebase/firebase-js-sdk/pull/5587) - Add "repository" field to package.json files that were missing it.

- Updated dependencies [[`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f)]:
  - @firebase/database@0.12.2

## 0.1.1

### Patch Changes

- [`dfe65ff9b`](https://github.com/firebase/firebase-js-sdk/commit/dfe65ff9bfa66d318d45e2a666e302867ae53a01) [#5537](https://github.com/firebase/firebase-js-sdk/pull/5537) - Added an entry point `@firebase/database-compat/standalone` to share code with Admin SDK properly

* [`b79bd33e4`](https://github.com/firebase/firebase-js-sdk/commit/b79bd33e4d3fe6c051b29a85d5141fcb8dcc8d2d) [#5531](https://github.com/firebase/firebase-js-sdk/pull/5531) - export types from @firebase/database-compat for admin SDK

* Updated dependencies [[`dfe65ff9b`](https://github.com/firebase/firebase-js-sdk/commit/dfe65ff9bfa66d318d45e2a666e302867ae53a01), [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/database@0.12.1
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7
  - @firebase/database-types@0.9.1

## 0.1.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - @firebase/database@0.12.0
  - @firebase/database-types@0.9.0
