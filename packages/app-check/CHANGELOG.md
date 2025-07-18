# @firebase/app-check

## 0.11.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 0.10.1

### Patch Changes

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 0.10.0

### Minor Changes

- [`6be75f7`](https://github.com/firebase/firebase-js-sdk/commit/6be75f74dec92d1b84f77f79ccb770a3e23280b7) [#9010](https://github.com/firebase/firebase-js-sdk/pull/9010) - Default `automaticDataCollectionEnabled` to true without changing App Check's default behavior.

### Patch Changes

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 0.9.3

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 0.9.2

### Patch Changes

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 0.9.1

### Patch Changes

- [`51e7b48`](https://github.com/firebase/firebase-js-sdk/commit/51e7b489d8aadd531453f882421903da8727b19d) [#9007](https://github.com/firebase/firebase-js-sdk/pull/9007) - Revert https://github.com/firebase/firebase-js-sdk/pull/8999

## 0.9.0

### Minor Changes

- [`3789b5a`](https://github.com/firebase/firebase-js-sdk/commit/3789b5ad16ffd462fce1d0b9c2e9ffae373bc6eb) [#8999](https://github.com/firebase/firebase-js-sdk/pull/8999) - Default automaticDataCollectionEnabled to true without changing App Check's default behavior.

### Patch Changes

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 0.8.13

### Patch Changes

- [`95b4fc6`](https://github.com/firebase/firebase-js-sdk/commit/95b4fc69d8e85991e6da20e4bf68d54d4e6741d6) [#8842](https://github.com/firebase/firebase-js-sdk/pull/8842) (fixes [#8822](https://github.com/firebase/firebase-js-sdk/issues/8822)) - Improve error handling in AppCheck. The publicly-exported `getToken()` will now throw `internalError` strings it was previously ignoring.

## 0.8.12

### Patch Changes

- [`f681482`](https://github.com/firebase/firebase-js-sdk/commit/f68148253349b8e80fc649386fede51339266a3c) [#8792](https://github.com/firebase/firebase-js-sdk/pull/8792) - Fixed a bug that caused an error to be thrown when the debug exchange failed.

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 0.8.11

### Patch Changes

- [`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc) [#8600](https://github.com/firebase/firebase-js-sdk/pull/8600) (fixes [#6462](https://github.com/firebase/firebase-js-sdk/issues/6462)) - Generate UUIDs with `crypto.randomUUID()` instead of custom uuidv4 function that uses `Math.random()`.

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 0.8.10

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 0.8.9

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 0.8.8

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 0.8.7

### Patch Changes

- [`a9f844066`](https://github.com/firebase/firebase-js-sdk/commit/a9f844066045d8567ae143bae77d184ac227690d) [#8395](https://github.com/firebase/firebase-js-sdk/pull/8395) - Revert introduction of safevalues to prevent issues from arising in Browser CommonJS environments due to ES5 incompatibility. For more information, see [GitHub PR #8395](https://github.com/firebase/firebase-js-sdk/pull/8395)

## 0.8.6

### Patch Changes

- [`f58d48cd4`](https://github.com/firebase/firebase-js-sdk/commit/f58d48cd42c9f09eab4d8b2a606af360528917f8) [#8301](https://github.com/firebase/firebase-js-sdk/pull/8301) - Begin using [safevalues](https://github.com/google/safevalues) to sanitize HTML vulnerable to XSS.

## 0.8.5

### Patch Changes

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 0.8.4

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6

## 0.8.3

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/component@0.6.6
  - @firebase/logger@0.4.1
  - @firebase/util@1.9.5

## 0.8.2

### Patch Changes

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 0.8.1

### Patch Changes

- [`1d32137c5`](https://github.com/firebase/firebase-js-sdk/commit/1d32137c546a576298adb1713a9862cc92a26c83) [#7822](https://github.com/firebase/firebase-js-sdk/pull/7822) - Prevent App Check from logging "uncaught" cancelled promises. The cancelled promises are part of App Check's expected behavior, and their cancellation wasn't intended to produce errors or warnings. See issue #7805.

## 0.8.0

### Minor Changes

- [`e12e7f535`](https://github.com/firebase/firebase-js-sdk/commit/e12e7f53516b77f73e3781ffb64385d52982f653) [#7296](https://github.com/firebase/firebase-js-sdk/pull/7296) - Add support for App Check replay protection in callable functions

## 0.7.0

### Minor Changes

- [`195e82ebb`](https://github.com/firebase/firebase-js-sdk/commit/195e82ebba29d501892cf9269ecee74eec9df220) [#7169](https://github.com/firebase/firebase-js-sdk/pull/7169) - Add new limited use token method to App Check

## 0.6.5

### Patch Changes

- [`8c44d5863`](https://github.com/firebase/firebase-js-sdk/commit/8c44d586355ffd2d58b6841730ebdac89229954c) [#7203](https://github.com/firebase/firebase-js-sdk/pull/7203) - Catch all ReCAPTCHA errors and, if caught, prevent App Check from making a request to the exchange endpoint.

## 0.6.4

### Patch Changes

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 0.6.3

### Patch Changes

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 0.6.2

### Patch Changes

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 0.6.1

### Patch Changes

- Updated dependencies [[`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 0.6.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0
  - @firebase/logger@0.4.0

## 0.5.17

### Patch Changes

- [`457fc2eeb`](https://github.com/firebase/firebase-js-sdk/commit/457fc2eeb6922fd4eaa5e305cd10ee05e86293be) [#6740](https://github.com/firebase/firebase-js-sdk/pull/6740) (fixes [#6734](https://github.com/firebase/firebase-js-sdk/issues/6734)) - Clear App Check exchange promise correctly after request succeeds.

## 0.5.16

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3

## 0.5.15

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 0.5.14

### Patch Changes

- Updated dependencies [[`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 0.5.13

### Patch Changes

- [`b3951c6e4`](https://github.com/firebase/firebase-js-sdk/commit/b3951c6e42559d8aa82711b71440f4adcdae3b56) [#6617](https://github.com/firebase/firebase-js-sdk/pull/6617) (fixes [#6373](https://github.com/firebase/firebase-js-sdk/issues/6373)) - Fix timer issues in App Check that caused the token to fail to refresh after the token expired, or caused rapid repeated requests attempting to do so.

- Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 0.5.12

### Patch Changes

- [`f36d627af`](https://github.com/firebase/firebase-js-sdk/commit/f36d627af6e1f5ed98e21f9be29f59d2c8c503cb) [#6439](https://github.com/firebase/firebase-js-sdk/pull/6439) - Fix logic to trigger app check throttling

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
