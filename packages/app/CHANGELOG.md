# @firebase/app

## 0.14.0

### Minor Changes

- [`d91169f`](https://github.com/firebase/firebase-js-sdk/commit/d91169f061bf1dcbfe78a8c8a7f739677608fcb7) [#9151](https://github.com/firebase/firebase-js-sdk/pull/9151) (fixes [#8863](https://github.com/firebase/firebase-js-sdk/issues/8863)) - initializeServerApp now supports auto-initialization for Firebase App Hosting.

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 0.13.2

### Patch Changes

- [`bb57947`](https://github.com/firebase/firebase-js-sdk/commit/bb57947c942e44b39e5b0254324bee6bf665fd4e) [#9112](https://github.com/firebase/firebase-js-sdk/pull/9112) (fixes [#8988](https://github.com/firebase/firebase-js-sdk/issues/8988)) - Add "react-native" entry point to @firebase/app

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 0.13.1

### Patch Changes

- Update SDK_VERSION.

## 0.13.0

### Minor Changes

- [`6be75f7`](https://github.com/firebase/firebase-js-sdk/commit/6be75f74dec92d1b84f77f79ccb770a3e23280b7) [#9010](https://github.com/firebase/firebase-js-sdk/pull/9010) - Default `automaticDataCollectionEnabled` to true without changing App Check's default behavior.

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 0.12.3

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 0.12.2

### Patch Changes

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 0.12.1

### Patch Changes

- [`51e7b48`](https://github.com/firebase/firebase-js-sdk/commit/51e7b489d8aadd531453f882421903da8727b19d) [#9007](https://github.com/firebase/firebase-js-sdk/pull/9007) - Revert https://github.com/firebase/firebase-js-sdk/pull/8999

## 0.12.0

### Minor Changes

- [`3789b5a`](https://github.com/firebase/firebase-js-sdk/commit/3789b5ad16ffd462fce1d0b9c2e9ffae373bc6eb) [#8999](https://github.com/firebase/firebase-js-sdk/pull/8999) - Default automaticDataCollectionEnabled to true without changing App Check's default behavior.

### Patch Changes

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 0.11.5

### Patch Changes

- Update SDK_VERSION.

## 0.11.4

### Patch Changes

- Update SDK_VERSION.

## 0.11.3

### Patch Changes

- Update SDK_VERSION.

## 0.11.2

### Patch Changes

- Update SDK_VERSION.

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 0.11.1

### Patch Changes

- Update SDK_VERSION.

## 0.11.0

### Minor Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

### Patch Changes

- [`dafae52`](https://github.com/firebase/firebase-js-sdk/commit/dafae52afda0b653a763b071960ee87010a63aa1) [#8724](https://github.com/firebase/firebase-js-sdk/pull/8724) - Discard the earliest heartbeat once a limit of 30 heartbeats in storage has been hit.

## 0.10.18

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 0.10.17

### Patch Changes

- Update SDK_VERSION.

## 0.10.16

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 0.10.15

### Patch Changes

- Update SDK_VERSION.

## 0.10.14

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 0.10.13

### Patch Changes

- Update SDK_VERSION.

## 0.10.12

### Patch Changes

- [`beaa4dffb`](https://github.com/firebase/firebase-js-sdk/commit/beaa4dffb7f48cb12ccc6c1d1b7cdc9c3605fc04) [#8480](https://github.com/firebase/firebase-js-sdk/pull/8480) - Included Data Connect product.

## 0.10.11

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 0.10.10

### Patch Changes

- [`05c34c91e`](https://github.com/firebase/firebase-js-sdk/commit/05c34c91e61deb1c148ff1bc99333fc50e9e371f) [#8437](https://github.com/firebase/firebase-js-sdk/pull/8437) - Removed an unnecessary console.log statement.

## 0.10.9

### Patch Changes

- [`6d6ce8100`](https://github.com/firebase/firebase-js-sdk/commit/6d6ce8100fd1443a40cd1ebd68ad980cab55fb10) [#8425](https://github.com/firebase/firebase-js-sdk/pull/8425) (fixes [#8407](https://github.com/firebase/firebase-js-sdk/issues/8407)) - Prevent heartbeats methods from throwing - warn instead.

## 0.10.8

### Patch Changes

- Update SDK_VERSION.

## 0.10.7

### Patch Changes

- Update SDK_VERSION.

## 0.10.6

### Patch Changes

- [`ed1c99379`](https://github.com/firebase/firebase-js-sdk/commit/ed1c993796cf7d7544b9f9ac8ffde71a13324aaf) [#8335](https://github.com/firebase/firebase-js-sdk/pull/8335) - Guard the use of `FinalizationRegistry` in `FirebaseServerApp` initialization based on the availability of `FinalizationRegistry` in the runtime.

- [`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558) [#8315](https://github.com/firebase/firebase-js-sdk/pull/8315) (fixes [#8299](https://github.com/firebase/firebase-js-sdk/issues/8299)) - fix: server app should initialize in web workers

- [`f01806221`](https://github.com/firebase/firebase-js-sdk/commit/f01806221bcf1edb4356c5901ee65ba322851981) [#8341](https://github.com/firebase/firebase-js-sdk/pull/8341) - The `FirebaseServerAppSettings.name` field inherited from `FirebaseAppSettings` is now omitted
  instead of overloading the value as `undefined`. This fixes a TypeScript compilation error. For more
  information, see [GitHub Issue #8336](https://github.com/firebase/firebase-js-sdk/issues/8336).
- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 0.10.5

### Patch Changes

- Update SDK_VERSION.

## 0.10.4

### Patch Changes

- Update SDK_VERSION.

## 0.10.3

### Patch Changes

- [`506b8a6ab`](https://github.com/firebase/firebase-js-sdk/commit/506b8a6abf662d74c2085fb729cace57d861ed17) [#8119](https://github.com/firebase/firebase-js-sdk/pull/8119) - Add the preview version of the VertexAI SDK.

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6

## 0.10.2

### Patch Changes

- Update SDK_VERSION.

## 0.10.1

### Patch Changes

- [`6d31930b3`](https://github.com/firebase/firebase-js-sdk/commit/6d31930b3abe1588ae81a5c14b59cd386fddc718) [#8109](https://github.com/firebase/firebase-js-sdk/pull/8109) - FirebaseServerApp should not be JSON serializable

- [`ad8d5470d`](https://github.com/firebase/firebase-js-sdk/commit/ad8d5470dad9b9ec1bcd939609da4a1c439c8414) [#8134](https://github.com/firebase/firebase-js-sdk/pull/8134) - Updated dependencies. See GitHub PR #8098.

## 0.10.0

### Minor Changes

- [`ed84efe50`](https://github.com/firebase/firebase-js-sdk/commit/ed84efe50bfc365da8ebfacdd2b17b5cc2a9e596) [#8005](https://github.com/firebase/firebase-js-sdk/pull/8005) - Added the new `FirebaseServerApp` interface to bridge state
  data between client and server runtime environments. This interface extends `FirebaseApp`.

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/component@0.6.6
  - @firebase/logger@0.4.1
  - @firebase/util@1.9.5

## 0.9.29

### Patch Changes

- Update SDK_VERSION.

## 0.9.28

### Patch Changes

- Update SDK_VERSION.

## 0.9.27

### Patch Changes

- [`3f8cbcd18`](https://github.com/firebase/firebase-js-sdk/commit/3f8cbcd18f47fcae8c0d8060fd8c245c025784c0) [#7984](https://github.com/firebase/firebase-js-sdk/pull/7984) - Catch `transaction.done` errors in `readHeartbeatsFromIndexedDB` and log them as a warning, because platform logging errors should never throw or block user app functionality.

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 0.9.26

### Patch Changes

- [`16728cf3c`](https://github.com/firebase/firebase-js-sdk/commit/16728cf3c6b4e358dc3d12f80623e5966f104c31) [#7890](https://github.com/firebase/firebase-js-sdk/pull/7890) (fixes [#7829](https://github.com/firebase/firebase-js-sdk/issues/7829)) - Catch possible error in Safari browsers.

## 0.9.25

### Patch Changes

- Update SDK_VERSION.

## 0.9.24

### Patch Changes

- [`e9ff107ee`](https://github.com/firebase/firebase-js-sdk/commit/e9ff107eedbb9ec695ddc35e45bdd62734735674) [#7789](https://github.com/firebase/firebase-js-sdk/pull/7789) - More safeguards to ensure that heartbeat objects queried from IndexedDB include a heartbeats field.

## 0.9.23

### Patch Changes

- [`5c7fa8491`](https://github.com/firebase/firebase-js-sdk/commit/5c7fa84912ac8a9652b82ebf88eb483dd44977a8) [#7749](https://github.com/firebase/firebase-js-sdk/pull/7749) - App - provide a more robust check to cover more cases of empty heartbeat data.

## 0.9.22

### Patch Changes

- Update SDK_VERSION.

## 0.9.21

### Patch Changes

- Update SDK_VERSION.

## 0.9.20

### Patch Changes

- Update SDK_VERSION.

## 0.9.19

### Patch Changes

- Update SDK_VERSION.

## 0.9.18

### Patch Changes

- Update SDK_VERSION.

## 0.9.17

### Patch Changes

- Update SDK_VERSION.

## 0.9.16

### Patch Changes

- Update SDK_VERSION.

## 0.9.15

### Patch Changes

- Update SDK_VERSION.

## 0.9.14

### Patch Changes

- Update SDK_VERSION.

## 0.9.13

### Patch Changes

- Update SDK_VERSION.

## 0.9.12

### Patch Changes

- Update SDK_VERSION.

## 0.9.11

### Patch Changes

- Update SDK_VERSION.

## 0.9.10

### Patch Changes

- [`466d3670a`](https://github.com/firebase/firebase-js-sdk/commit/466d3670ae32b61e3e0319bb73407bcd7ac90290) [#7263](https://github.com/firebase/firebase-js-sdk/pull/7263) - Make the error more helpful when `getApp()` is called before `initializeApp()`.

- [`e0551fa13`](https://github.com/firebase/firebase-js-sdk/commit/e0551fa13c9ae1556edf0ffb967f2f9e661f18a0) [#7272](https://github.com/firebase/firebase-js-sdk/pull/7272) (fixes [#6871](https://github.com/firebase/firebase-js-sdk/issues/6871)) - Catch more heartbeat read/write errors.

## 0.9.9

### Patch Changes

- Update SDK_VERSION.

## 0.9.8

### Patch Changes

- Update SDK_VERSION.

## 0.9.7

### Patch Changes

- Update SDK_VERSION.

## 0.9.6

### Patch Changes

- Update SDK_VERSION.

## 0.9.5

### Patch Changes

- Update SDK_VERSION.

## 0.9.4

### Patch Changes

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.9.3

### Patch Changes

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.9.2

### Patch Changes

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.9.1

### Patch Changes

- Updated dependencies [[`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 0.9.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0
  - @firebase/logger@0.4.0

## 0.8.4

### Patch Changes

- Update SDK_VERSION.

## 0.8.3

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3

## 0.8.2

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.8.1

### Patch Changes

- Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.8.0

### Minor Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

### Patch Changes

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.7.33

### Patch Changes

- Update SDK_VERSION.

## 0.7.32

### Patch Changes

- Update SDK_VERSION.

## 0.7.31

### Patch Changes

- Update SDK_VERSION.

## 0.7.30

### Patch Changes

- [`82a6add13`](https://github.com/firebase/firebase-js-sdk/commit/82a6add1354fe7e4ac1d444157ac027cdd41da6e) [#6480](https://github.com/firebase/firebase-js-sdk/pull/6480) - Prevent core app from throwing if IndexedDB heartbeat functions throw.

## 0.7.29

### Patch Changes

- Update SDK_VERSION.

## 0.7.28

### Patch Changes

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 0.7.27

### Patch Changes

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 0.7.26

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

- Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1

## 0.7.25

### Patch Changes

- Update SDK_VERSION.

## 0.7.24

### Patch Changes

- Update SDK_VERSION.

## 0.7.23

### Patch Changes

- [`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801) [#6154](https://github.com/firebase/firebase-js-sdk/pull/6154) - Replace stopgap firebase/util IndexedDB methods with `idb` library.

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 0.7.22

### Patch Changes

- Update SDK_VERSION.

## 0.7.21

### Patch Changes

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 0.7.20

### Patch Changes

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 0.7.19

### Patch Changes

- [`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03) [#6061](https://github.com/firebase/firebase-js-sdk/pull/6061) - Remove idb dependency and replace with our own code.

* [`927c1afc1`](https://github.com/firebase/firebase-js-sdk/commit/927c1afc103e4f9b8a75320d3946a4c840445a2a) [#6039](https://github.com/firebase/firebase-js-sdk/pull/6039) - Fix heartbeat controller to ensure not sending more than one a day.

* Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 0.7.18

### Patch Changes

- [`1588990b7`](https://github.com/firebase/firebase-js-sdk/commit/1588990b7fb06b6fa545c0d478663e137ec0ea07) [#5723](https://github.com/firebase/firebase-js-sdk/pull/5723) - Add heartbeat controller for platform logging.

## 0.7.17

### Patch Changes

- Update SDK_VERSION.

## 0.7.16

### Patch Changes

- Update SDK_VERSION.

## 0.7.15

### Patch Changes

- Update SDK_VERSION.

## 0.7.14

### Patch Changes

- Update SDK_VERSION.

## 0.7.13

### Patch Changes

- Update SDK_VERSION.

## 0.7.12

### Patch Changes

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 0.7.11

### Patch Changes

- Update SDK_VERSION.

## 0.7.10

### Patch Changes

- Update SDK_VERSION.

## 0.7.9

### Patch Changes

- Update SDK_VERSION.

## 0.7.8

### Patch Changes

- Update SDK_VERSION.

## 0.7.7

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2

## 0.7.6

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1

## 0.7.5

### Patch Changes

- Update SDK_VERSION.

## 0.7.4

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 0.7.3

### Patch Changes

- Update SDK_VERSION.

## 0.7.2

### Patch Changes

- Update SDK_VERSION.

## 0.7.1

### Patch Changes

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.7.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.6.30

### Patch Changes

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/util@1.3.0

## 0.6.29

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c), [`3d10d33bc`](https://github.com/firebase/firebase-js-sdk/commit/3d10d33bc167177fecbf86d2a6574af2e4e210f9)]:
  - @firebase/util@1.2.0
  - @firebase/app-types@0.6.3
  - @firebase/component@0.5.5

## 0.6.28

### Patch Changes

- Updated dependencies [[`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/component@0.5.4

## 0.6.27

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 0.6.26

### Patch Changes

- Update SDK_VERSION.

## 0.6.25

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 0.6.24

### Patch Changes

- Update SDK_VERSION.

## 0.6.23

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 0.6.22

### Patch Changes

- [`60e834739`](https://github.com/firebase/firebase-js-sdk/commit/60e83473940e60f8390b1b0f97cf45a1733f66f0) [#4897](https://github.com/firebase/firebase-js-sdk/pull/4897) - Make App Check initialization explicit, to prevent unexpected errors for users who do not intend to use App Check.

## 0.6.21

### Patch Changes

- [`e123f241c`](https://github.com/firebase/firebase-js-sdk/commit/e123f241c0cf39a983645582c4e42b7a5bff7bd6) [#4857](https://github.com/firebase/firebase-js-sdk/pull/4857) - Add AppCheck platform logging string.

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/util@1.1.0

## 0.6.20

### Patch Changes

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda)]:
  - @firebase/util@1.0.0
  - @firebase/component@0.4.1

## 0.6.19

### Patch Changes

- [`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3) [#4714](https://github.com/firebase/firebase-js-sdk/pull/4714) - Internal typing changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3), [`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0
  - @firebase/app-types@0.6.2

## 0.6.18

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - @firebase/component@0.3.1

## 0.6.17

### Patch Changes

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0

## 0.6.16

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e)]:
  - @firebase/util@0.4.0
  - @firebase/component@0.2.1

## 0.6.15

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 0.6.14

### Patch Changes

- [`749c7f3d9`](https://github.com/firebase/firebase-js-sdk/commit/749c7f3d985f978cd2a204cbc28c3fff09458b5b) [#4298](https://github.com/firebase/firebase-js-sdk/pull/4298) (fixes [#4258](https://github.com/firebase/firebase-js-sdk/issues/4258)) - Firestore classes like DocumentReference and Query can now be serialized to JSON (#4258)

## 0.6.13

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 0.6.12

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

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce)]:
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3

## 0.6.11

### Patch Changes

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 0.6.10

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 0.6.9

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 0.6.8

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
