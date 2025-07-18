# @firebase/util

## 1.13.0

### Minor Changes

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

## 1.12.1

### Patch Changes

- [`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83) [#9111](https://github.com/firebase/firebase-js-sdk/pull/9111) - Fixed issue where Storage on Firebase Studio throws CORS errors.

## 1.12.0

### Minor Changes

- [`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27) [#8993](https://github.com/firebase/firebase-js-sdk/pull/8993) - Fix Safari/WebKit cache issues when client-side indexing is used.

## 1.11.3

### Patch Changes

- [`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b) [#9043](https://github.com/firebase/firebase-js-sdk/pull/9043) - Fixed emulator overlay behavior on scroll

## 1.11.2

### Patch Changes

- [`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24) [#9031](https://github.com/firebase/firebase-js-sdk/pull/9031) - Add Emulator Overlay

## 1.11.1

### Patch Changes

- [`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875) [#8980](https://github.com/firebase/firebase-js-sdk/pull/8980) - Auto Enable SSL for Firebase Studio

- [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb) [#8968](https://github.com/firebase/firebase-js-sdk/pull/8968) - Fix Auth Redirects on Firebase Studio

## 1.11.0

### Minor Changes

- [`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5) [#8483](https://github.com/firebase/firebase-js-sdk/pull/8483) - Add support for the `FIREBASE_WEBAPP_CONFIG` environment variable at install time.

## 1.10.3

### Patch Changes

- [`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc) [#8600](https://github.com/firebase/firebase-js-sdk/pull/8600) (fixes [#6462](https://github.com/firebase/firebase-js-sdk/issues/6462)) - Generate UUIDs with `crypto.randomUUID()` instead of custom uuidv4 function that uses `Math.random()`.

## 1.10.2

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

## 1.10.1

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

## 1.10.0

### Minor Changes

- [`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741) [#8393](https://github.com/firebase/firebase-js-sdk/pull/8393) - Suppress the use of the `fetch` parameter `referrerPolicy` within Auth for `fetch` requests originating from Cloudflare Workers. Clouldflare Worker environments do not support this parameter and throw when it's used.

## 1.9.7

### Patch Changes

- [`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558) [#8315](https://github.com/firebase/firebase-js-sdk/pull/8315) (fixes [#8299](https://github.com/firebase/firebase-js-sdk/issues/8299)) - fix: browser detection (detect either window or web worker)

## 1.9.6

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

## 1.9.5

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

## 1.9.4

### Patch Changes

- [`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070) [#7963](https://github.com/firebase/firebase-js-sdk/pull/7963) (fixes [#7962](https://github.com/firebase/firebase-js-sdk/issues/7962)) - Fix isSafari() throwing on React Native

## 1.9.3

### Patch Changes

- [`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6) [#7019](https://github.com/firebase/firebase-js-sdk/pull/7019) - Modify base64 decoding logic to throw on invalid input, rather than silently truncating it.

## 1.9.2

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

## 1.9.1

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

## 1.9.0

### Minor Changes

- [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8) [#6901](https://github.com/firebase/firebase-js-sdk/pull/6901) - Allow users to specify their environment as `node` or `browser` to override Firebase's runtime environment detection and force the SDK to act as if it were in the respective environment.

### Patch Changes

- [`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3) [#6874](https://github.com/firebase/firebase-js-sdk/pull/6874) (fixes [#6838](https://github.com/firebase/firebase-js-sdk/issues/6838)) - Reformat a comment that causes compile errors in some build toolchains.

## 1.8.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

### Patch Changes

- [`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666) [#6841](https://github.com/firebase/firebase-js-sdk/pull/6841) - Fix for third party window content that cannot access IndexedDB if the browser is set to never accept third party cookies on Firefox.

## 1.7.3

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

## 1.7.2

### Patch Changes

- [`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d) [#6686](https://github.com/firebase/firebase-js-sdk/pull/6686) (fixes [#6677](https://github.com/firebase/firebase-js-sdk/issues/6677)) - Catch errors when the SDK checks for `__FIREBASE_DEFAULTS__` and do not block other app functionality.

## 1.7.1

### Patch Changes

- [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561) [#6673](https://github.com/firebase/firebase-js-sdk/pull/6673) - Handle IPv6 addresses in emulator autoinit.

* [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18) [#6665](https://github.com/firebase/firebase-js-sdk/pull/6665) (fixes [#6660](https://github.com/firebase/firebase-js-sdk/issues/6660)) - Remove `__FIREBASE_DEFAULTS_PATH__` option for now, as the current implementation causes Webpack warnings. Also fix `process.env` check to work in environments where `process` exists but `process.env` does not.

## 1.7.0

### Minor Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

## 1.6.3

### Patch Changes

- [`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf) [#6340](https://github.com/firebase/firebase-js-sdk/pull/6340) (fixes [#6036](https://github.com/firebase/firebase-js-sdk/issues/6036)) - Forced `get()` to wait until db is online to resolve.

## 1.6.2

### Patch Changes

- [`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0) [#6363](https://github.com/firebase/firebase-js-sdk/pull/6363) - Extract uuid function into @firebase/util

## 1.6.1

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

## 1.6.0

### Minor Changes

- [`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801) [#6154](https://github.com/firebase/firebase-js-sdk/pull/6154) - Replace stopgap firebase/util IndexedDB methods with `idb` library.

## 1.5.2

### Patch Changes

- [`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59) [#6122](https://github.com/firebase/firebase-js-sdk/pull/6122) (fixes [#6121](https://github.com/firebase/firebase-js-sdk/issues/6121)) - Default indexeddb transaction mode to readonly for IE11 compatibility

## 1.5.1

### Patch Changes

- [`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef) [#6088](https://github.com/firebase/firebase-js-sdk/pull/6088) - Remove unneeded types from public typings file.

## 1.5.0

### Minor Changes

- [`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03) [#6061](https://github.com/firebase/firebase-js-sdk/pull/6061) - Remove idb dependency and replace with our own code.

## 1.4.3

### Patch Changes

- [`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49) [#5831](https://github.com/firebase/firebase-js-sdk/pull/5831) (fixes [#5754](https://github.com/firebase/firebase-js-sdk/issues/5754)) - FirestoreError and StorageError now extend FirebaseError

## 1.4.2

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

## 1.4.1

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

## 1.4.0

### Minor Changes

- [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39) [#5539](https://github.com/firebase/firebase-js-sdk/pull/5539) - Use esm2017 builds by default

### Patch Changes

- [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422) [#5506](https://github.com/firebase/firebase-js-sdk/pull/5506) - areCookiesEnabled could encounter runtime errors in certain environments

## 1.3.0

### Minor Changes

- [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131) [#5282](https://github.com/firebase/firebase-js-sdk/pull/5282) - Implement mockUserToken for Storage and fix JWT format bugs.

## 1.2.0

### Minor Changes

- [`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c) [#5207](https://github.com/firebase/firebase-js-sdk/pull/5207) - Added deepEqual for comparing objects

## 1.1.0

### Minor Changes

- [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467) [#4792](https://github.com/firebase/firebase-js-sdk/pull/4792) - Add mockUserToken support for database emulator.

## 1.0.0

### Major Changes

- [`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda) [#4720](https://github.com/firebase/firebase-js-sdk/pull/4720) - Internal changes to Database and Validation APIs.

## 0.4.1

### Patch Changes

- [`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a) [#4673](https://github.com/firebase/firebase-js-sdk/pull/4673) - Added a utility function and type for compat interop API

## 0.4.0

### Minor Changes

- [`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e) [#4610](https://github.com/firebase/firebase-js-sdk/pull/4610) - Add extractQuerystring() function which extracts the query string part of a URL, including the leading question mark (if present).

## 0.3.4

### Patch Changes

- [`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada) [#4001](https://github.com/firebase/firebase-js-sdk/pull/4001) - Do not merge `__proto__` in `deepExtend` to prevent `__proto__` pollution.

## 0.3.3

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

* [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce) [#3946](https://github.com/firebase/firebase-js-sdk/pull/3946) - Write template data to a new `customData` field in`FirebaseError` instead of writing to the error object itself to avoid overwriting existing fields.

## 0.3.2

### Patch Changes

- [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290) [#2800](https://github.com/firebase/firebase-js-sdk/pull/2800) - Moved `calculateBackoffMillis()` exponential backoff function from remote-config to util,
  where it can be shared between packages.

## 0.3.1

### Patch Changes

- [`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089) [#3585](https://github.com/firebase/firebase-js-sdk/pull/3585) - Extended Usage of `isIndexedDBAvailable` to Service Worker

## 0.3.0

### Minor Changes

- [`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c) [#3472](https://github.com/firebase/firebase-js-sdk/pull/3472) - - Fix an error where an analytics PR included a change to `@firebase/util`, but
  the util package was not properly included in the changeset for a patch bump.

  - `@firebase/util` adds environment check methods `isIndexedDBAvailable`
    `validateIndexedDBOpenable`, and `areCookiesEnabled`.
