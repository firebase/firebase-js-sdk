# @firebase/firestore

## 4.7.11

### Patch Changes

- [`ed0803a`](https://github.com/firebase/firebase-js-sdk/commit/ed0803a29791cc0cecd0153f95e814ddcee7efd8) [#8915](https://github.com/firebase/firebase-js-sdk/pull/8915) - Fixed the `null` value handling in `!=` and `not-in` filters.

- [`88a8055`](https://github.com/firebase/firebase-js-sdk/commit/88a8055808bdbd1c75011a94d11062460027d931) [#8888](https://github.com/firebase/firebase-js-sdk/pull/8888) (fixes [#6465](https://github.com/firebase/firebase-js-sdk/issues/6465)) - Fix 'window is not defined' error when calling `clearIndexedDbPersistence` from a service worker

- [`e055e90`](https://github.com/firebase/firebase-js-sdk/commit/e055e9057caab4d9f73734307fe4e0be2098249b) [#8313](https://github.com/firebase/firebase-js-sdk/pull/8313) - Add unique IDs and state information into fatal error messages instead of the generic "unexpected state" message.

- [`195d943`](https://github.com/firebase/firebase-js-sdk/commit/195d943103795a50bb3fc5c56ef2bb64610006a1) [#8871](https://github.com/firebase/firebase-js-sdk/pull/8871) (fixes [#8593](https://github.com/firebase/firebase-js-sdk/issues/8593)) - Fix issue where Firestore would produce `undefined` for document snapshot data if using IndexedDB persistence and "clear site data" (or equivalent) button was pressed in the web browser.

## 4.7.10

### Patch Changes

- [`feb2c9d`](https://github.com/firebase/firebase-js-sdk/commit/feb2c9dfa29c9dff01c1272e56f6258176dc6b3a) [#8787](https://github.com/firebase/firebase-js-sdk/pull/8787) - Use lazy encoding in UTF-8 encoded byte comparison for strings.

## 4.7.9

### Patch Changes

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 4.7.8

### Patch Changes

- [`3418ef8`](https://github.com/firebase/firebase-js-sdk/commit/3418ef8078ef2f8a7218e9a702cb42671f078b7d) [#8782](https://github.com/firebase/firebase-js-sdk/pull/8782) - Reverted a change to use UTF-8 encoding in string comparisons which caused a performance issue. See [GitHub issue #8778](https://github.com/firebase/firebase-js-sdk/issues/8778)

## 4.7.7

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

- [`721e5a7`](https://github.com/firebase/firebase-js-sdk/commit/721e5a7e97db5d2136c8338e2522dd07dbc3a29e) [#8691](https://github.com/firebase/firebase-js-sdk/pull/8691) - Fixed a server and sdk mismatch in unicode string sorting.

## 4.7.6

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 4.7.5

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- [`0f5714ba5`](https://github.com/firebase/firebase-js-sdk/commit/0f5714ba5baab119a73355c0fd86db5a44cd3d20) [#8595](https://github.com/firebase/firebase-js-sdk/pull/8595) (fixes [#8474](https://github.com/firebase/firebase-js-sdk/issues/8474)) - Prevent a possible condition of slow snapshots, caused by a rapid series of document update(s) followed by a delete.

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2
  - @firebase/webchannel-wrapper@1.0.3

## 4.7.4

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Removed dependency on undici and node-fetch in our node bundles, replacing them with the native fetch implementation.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/webchannel-wrapper@1.0.2
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 4.7.3

### Patch Changes

- [`ff0475c41`](https://github.com/firebase/firebase-js-sdk/commit/ff0475c41bfdac19872934f68b7f4e2651fd9a63) [#8259](https://github.com/firebase/firebase-js-sdk/pull/8259) - Re-enable useFetchStreams with the latest WebChannel implementation. This reduces the memory usage of WebChannel.

- [`47b091324`](https://github.com/firebase/firebase-js-sdk/commit/47b09132463d6a038b441d4623c24ca61e56505d) [#8430](https://github.com/firebase/firebase-js-sdk/pull/8430) - Refactor Firestore client instantiation. This prepares for future features that require client to restart.

## 4.7.2

### Patch Changes

- [`629919ea7`](https://github.com/firebase/firebase-js-sdk/commit/629919ea760e35b7d880a099edf7f42b5bcbae4b) [#8343](https://github.com/firebase/firebase-js-sdk/pull/8343) - Fix an issue with metadata `fromCache` defaulting to `true` when listening to cache in multi-tabs.

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 4.7.1

### Patch Changes

- [`62348e116`](https://github.com/firebase/firebase-js-sdk/commit/62348e116c795d19c5ca58729c250805240ce345) [#8432](https://github.com/firebase/firebase-js-sdk/pull/8432) (fixes [#8431](https://github.com/firebase/firebase-js-sdk/issues/8431)) - Update undici dependency to 6.19.7 due to a memory leak in older versions.

## 4.7.0

### Minor Changes

- [`e6b852562`](https://github.com/firebase/firebase-js-sdk/commit/e6b852562bfe57dd02ae59ee2dce9966b5498b01) [#8215](https://github.com/firebase/firebase-js-sdk/pull/8215) - Add support for reading and writing Firestore vectors.

## 4.6.5

### Patch Changes

- [`025f2a103`](https://github.com/firebase/firebase-js-sdk/commit/025f2a1037582da7d1afeb7a4d143cb7a154ec9d) [#8280](https://github.com/firebase/firebase-js-sdk/pull/8280) (fixes [#8279](https://github.com/firebase/firebase-js-sdk/issues/8279)) - Fixed typos in documentation and some internal variables and parameters.

## 4.6.4

### Patch Changes

- [`ecadbe380`](https://github.com/firebase/firebase-js-sdk/commit/ecadbe380ca1b7e2eeada45b82e53d47e05ec9b3) [#8339](https://github.com/firebase/firebase-js-sdk/pull/8339) (fixes [#8314](https://github.com/firebase/firebase-js-sdk/issues/8314)) - Fix persistence multi-tab snapshot listener metadata sync issue.

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558), [`b09a267ba`](https://github.com/firebase/firebase-js-sdk/commit/b09a267ba8c59d15865173844e73a92588342f61)]:
  - @firebase/util@1.9.7
  - @firebase/webchannel-wrapper@1.0.1
  - @firebase/component@0.6.8

## 4.6.3

### Patch Changes

- [`2ce95696f`](https://github.com/firebase/firebase-js-sdk/commit/2ce95696fe01f8c0fde08daa4359e39917654441) [#8247](https://github.com/firebase/firebase-js-sdk/pull/8247) - Fix multi-tab persistence raising empty snapshot issue

## 4.6.2

### Patch Changes

- [`4b49630c7`](https://github.com/firebase/firebase-js-sdk/commit/4b49630c7f0e5880c5ae153f50ca2eff5eb32fbd) [#8190](https://github.com/firebase/firebase-js-sdk/pull/8190) - Use closure-net as a dependency of webchannel-wrapper and Firestore.

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`14f9da66f`](https://github.com/firebase/firebase-js-sdk/commit/14f9da66fed45ac3f932ec590ca49c8a827d9fc5), [`4b49630c7`](https://github.com/firebase/firebase-js-sdk/commit/4b49630c7f0e5880c5ae153f50ca2eff5eb32fbd), [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/webchannel-wrapper@1.0.0
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6

## 4.6.1

### Patch Changes

- [`224419457`](https://github.com/firebase/firebase-js-sdk/commit/224419457c3fd2e5813166dbd7d6d9a03322143c) [#8145](https://github.com/firebase/firebase-js-sdk/pull/8145) - Prevent spurious "Backend didn't respond within 10 seconds" errors when network is indeed responding, just slowly.

- [`bd12e83cd`](https://github.com/firebase/firebase-js-sdk/commit/bd12e83cd1f0a10774dfb7e6ff7d4b0555a29a81) [#8150](https://github.com/firebase/firebase-js-sdk/pull/8150) - Updated protobufjs transitive dependency in Firestore.

- [`e1a7764cf`](https://github.com/firebase/firebase-js-sdk/commit/e1a7764cf36d246bb021d084e498604fe37e84aa) [#8197](https://github.com/firebase/firebase-js-sdk/pull/8197) - Go back using xmlhttprequest for bidi-streams, as fetch streams seem to be having connection issue.

- [`84f9ff008`](https://github.com/firebase/firebase-js-sdk/commit/84f9ff0085993159c3513cb859852a5c79145b1b) [#8178](https://github.com/firebase/firebase-js-sdk/pull/8178) - Reduce code bundle size by 6.5 kB in applications that only use memory persistence (the default persistence mode). This bundle size regression was accidentally introduced in v10.7.2.

## 4.6.0

### Minor Changes

- [`666dddae0`](https://github.com/firebase/firebase-js-sdk/commit/666dddae0b050204c59f70e74010fd92a6b54187) [#7999](https://github.com/firebase/firebase-js-sdk/pull/7999) - Enable queries with range & inequality filters on multiple fields.

### Patch Changes

- [`fe09d8338`](https://github.com/firebase/firebase-js-sdk/commit/fe09d8338d7d5f7a82d8cd73cf825adbe5551975) [#8138](https://github.com/firebase/firebase-js-sdk/pull/8138) (fixes [#8132](https://github.com/firebase/firebase-js-sdk/issues/8132)) - Update undici version to 5.28.4 due to CVE-2024-30260.

- [`c6ecac8ac`](https://github.com/firebase/firebase-js-sdk/commit/c6ecac8ac7110622d178d9450446318a4d0c474e) [#8090](https://github.com/firebase/firebase-js-sdk/pull/8090) (fixes [#8031](https://github.com/firebase/firebase-js-sdk/issues/8031)) - Fixed the CSI issue where indexing on timestamp fields leads to incorrect query results.

- [`a6fa54417`](https://github.com/firebase/firebase-js-sdk/commit/a6fa544173aeeee9d4f35e1ebd36fe2c2f461d19) [#8142](https://github.com/firebase/firebase-js-sdk/pull/8142) - Fix internal assertion due to Buffer value not evaluating to instanceof Uint8Array, encountered when testing with jsdom.

- [`ad8d5470d`](https://github.com/firebase/firebase-js-sdk/commit/ad8d5470dad9b9ec1bcd939609da4a1c439c8414) [#8134](https://github.com/firebase/firebase-js-sdk/pull/8134) - Updated dependencies. See GitHub PR #8098.

## 4.5.1

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

- Updated dependencies [[`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0)]:
  - @firebase/webchannel-wrapper@0.10.6
  - @firebase/component@0.6.6
  - @firebase/logger@0.4.1
  - @firebase/util@1.9.5

## 4.5.0

### Minor Changes

- [`ce88e71e7`](https://github.com/firebase/firebase-js-sdk/commit/ce88e71e738ac7bb2cd5d63e4e314e2de82f72ef) [#7982](https://github.com/firebase/firebase-js-sdk/pull/7982) - Enable snapshot listener option to retrieve data from local cache only.

## 4.4.3

### Patch Changes

- [`f3cec28df`](https://github.com/firebase/firebase-js-sdk/commit/f3cec28dfbdfc7f19c8218cf9d26956235d03fb0) [#8044](https://github.com/firebase/firebase-js-sdk/pull/8044) (fixes [#8038](https://github.com/firebase/firebase-js-sdk/issues/8038)) - Bump undici version to 5.28.3 due to security issue.

## 4.4.2

### Patch Changes

- Updated dependencies [[`434f8418c`](https://github.com/firebase/firebase-js-sdk/commit/434f8418c3db3ae98489a8461c437c248c039070)]:
  - @firebase/util@1.9.4
  - @firebase/component@0.6.5

## 4.4.1

### Patch Changes

- [`7481098d4`](https://github.com/firebase/firebase-js-sdk/commit/7481098d47d14acce901fa4c065ceff0cbf07d3d) [#7847](https://github.com/firebase/firebase-js-sdk/pull/7847) (fixes [#7747](https://github.com/firebase/firebase-js-sdk/issues/7747)) - Fixed leak of grpc-js resources on terminate.

- [`f4788453e`](https://github.com/firebase/firebase-js-sdk/commit/f4788453eb989d30495ddc7a3832e13c6d11b34e) [#7402](https://github.com/firebase/firebase-js-sdk/pull/7402) - Support special characters in query paths sent to `getCountFromServer(...)`, `getCount(...)` (lite API), and `getDocs(...)` (lite API).

- [`d7ace80d4`](https://github.com/firebase/firebase-js-sdk/commit/d7ace80d44ec870c3117cfed04ae6a1988c03c8e) [#7929](https://github.com/firebase/firebase-js-sdk/pull/7929) - Tweak the automatic index creation parameters to use more optimal values for the platform/browser detected at runtime.

- [`a476c4692`](https://github.com/firebase/firebase-js-sdk/commit/a476c4692dd1c1affbbd3139290dac54257dc5d2) [#7861](https://github.com/firebase/firebase-js-sdk/pull/7861) (fixes [#7706](https://github.com/firebase/firebase-js-sdk/issues/7706)) - Update the `isEqual` function for arrayUnion, arrayRemove and increment.

## 4.4.0

### Minor Changes

- [`bebecdaad`](https://github.com/firebase/firebase-js-sdk/commit/bebecdaad7fa552505055ab7705da478203078b6) [#7705](https://github.com/firebase/firebase-js-sdk/pull/7705) - Replaced node-fetch v2.6.7 dependency with the latest version of undici (v5.26.5) in Node.js SDK
  builds for auth, firestore, functions and storage.

### Patch Changes

- [`0d29adc97`](https://github.com/firebase/firebase-js-sdk/commit/0d29adc974d72f93552dad53ebd8b4ecab2ce810) [#7740](https://github.com/firebase/firebase-js-sdk/pull/7740) - Fixed an issue in the local cache synchronization logic where all locally-cached documents that matched a resumed query would be unnecessarily re-downloaded; with the fix it now only downloads the documents that are known to be out-of-sync.

- [`00235ba68`](https://github.com/firebase/firebase-js-sdk/commit/00235ba68fdbb5d9788a14ba2bdd75cad87301e4) [#7771](https://github.com/firebase/firebase-js-sdk/pull/7771) (fixes [#6118](https://github.com/firebase/firebase-js-sdk/issues/6118)) - Fix high memory usage of Firestore in browsers.

- Updated dependencies [[`00235ba68`](https://github.com/firebase/firebase-js-sdk/commit/00235ba68fdbb5d9788a14ba2bdd75cad87301e4)]:
  - @firebase/webchannel-wrapper@0.10.5

## 4.3.2

### Patch Changes

- [`f27baf423`](https://github.com/firebase/firebase-js-sdk/commit/f27baf423b3c9834b94aed13a93a5385813fd7dd) [#7729](https://github.com/firebase/firebase-js-sdk/pull/7729) - Rolling back the use of useFetchStreams, which has lead to hanging and incomplete queries.

## 4.3.1

### Patch Changes

- [`12f25592c`](https://github.com/firebase/firebase-js-sdk/commit/12f25592c02de8d899926d215b0ffd383b1f3aa0) [#7696](https://github.com/firebase/firebase-js-sdk/pull/7696) - Clarify method documentation.

## 4.3.0

### Minor Changes

- [`02e2518ca`](https://github.com/firebase/firebase-js-sdk/commit/02e2518cabce16f47e4485c4c5a2a499e4d96e0c) [#7502](https://github.com/firebase/firebase-js-sdk/pull/7502) - Support sum and average aggregations.

- [`cca47353c`](https://github.com/firebase/firebase-js-sdk/commit/cca47353c9db1e16fa512f909525dd34920db1ba) [#7441](https://github.com/firebase/firebase-js-sdk/pull/7441) - Added a default template type parameter to withConverter() functions to improve backwards compatibility with the v9 SDK

## 4.2.0

### Minor Changes

- [`fbd8e0e2e`](https://github.com/firebase/firebase-js-sdk/commit/fbd8e0e2e17befcd514775e018fcc4f4c5ecfc43) [#7599](https://github.com/firebase/firebase-js-sdk/pull/7599) - Add `enablePersistentCacheIndexAutoCreation()` function to enable automatic creation of local cache query indexes, which can improve performance of local query execution.

### Patch Changes

- [`60e4a07d2`](https://github.com/firebase/firebase-js-sdk/commit/60e4a07d2c89b5ea473f903a942aabab03050fa5) [#7593](https://github.com/firebase/firebase-js-sdk/pull/7593) - Fix an issue where Firestore was incorrectly using XHR instead of fetch for streaming response.

- [`2d0a9f5fd`](https://github.com/firebase/firebase-js-sdk/commit/2d0a9f5fd921568bc76fcdee325b9ab5e6be8a58) [#7592](https://github.com/firebase/firebase-js-sdk/pull/7592) - Updated minor dependencies grpc (firestore) and firebase-admin (rules-unit-testing).

- Updated dependencies [[`60e4a07d2`](https://github.com/firebase/firebase-js-sdk/commit/60e4a07d2c89b5ea473f903a942aabab03050fa5)]:
  - @firebase/webchannel-wrapper@0.10.3

## 4.1.3

### Patch Changes

- [`12221ddb4`](https://github.com/firebase/firebase-js-sdk/commit/12221ddb41766f85d9c2327a8af9ba647cfa9f3e) [#7542](https://github.com/firebase/firebase-js-sdk/pull/7542) - Implemented internal logic to auto-create client-side indexes

- [`25cda8af6`](https://github.com/firebase/firebase-js-sdk/commit/25cda8af6a6fc15e33f0ce5644dd29d996e4716f) [#7587](https://github.com/firebase/firebase-js-sdk/pull/7587) - Implemented internal logic to delete all client-side indexes

## 4.1.2

### Patch Changes

- [`78d2738c2`](https://github.com/firebase/firebase-js-sdk/commit/78d2738c246555556cba8dcfe2932639f80523ea) [#7569](https://github.com/firebase/firebase-js-sdk/pull/7569) - Fix how we enable fetch streams.

- Updated dependencies [[`78d2738c2`](https://github.com/firebase/firebase-js-sdk/commit/78d2738c246555556cba8dcfe2932639f80523ea)]:
  - @firebase/webchannel-wrapper@0.10.2

## 4.1.1

### Patch Changes

- [`43e402fb4`](https://github.com/firebase/firebase-js-sdk/commit/43e402fb49a081a59729290627c7b20099ca46a4) [#7520](https://github.com/firebase/firebase-js-sdk/pull/7520) - Update @grpc/proto-loader from v0.6.13 to v0.7.8

- [`b395277f3`](https://github.com/firebase/firebase-js-sdk/commit/b395277f3de5d017df7b2edfba329682a0928453) [#7507](https://github.com/firebase/firebase-js-sdk/pull/7507) - Refactored aggregate query order-by normalization to support future aggregate operations.

## 4.1.0

### Minor Changes

- [`52b17b426`](https://github.com/firebase/firebase-js-sdk/commit/52b17b4267729c14adcb52f2d523572aa22e4759) [#7452](https://github.com/firebase/firebase-js-sdk/pull/7452) - Update the grpc dependency to the latest version.

### Patch Changes

- [`c5518c80f`](https://github.com/firebase/firebase-js-sdk/commit/c5518c80fc577d6ab4f524d49c44b6dfd6ed96e7) [#7440](https://github.com/firebase/firebase-js-sdk/pull/7440) - Fixed issue where count and lite API queries did not work with named databases.

## 4.0.0

### Major Changes

- [`f2fb56fc0`](https://github.com/firebase/firebase-js-sdk/commit/f2fb56fc0f5d1573fe7700f019c58ec2755a3478) [#7310](https://github.com/firebase/firebase-js-sdk/pull/7310) - Fixed updateDoc() typing issue by adding a 2nd type parameter to FirestoreDataConverter

### Minor Changes

- [`57f2a863f`](https://github.com/firebase/firebase-js-sdk/commit/57f2a863f188ca11b6167656fc7a7d7c9affc1d6) [#7318](https://github.com/firebase/firebase-js-sdk/pull/7318) (fixes [#6105](https://github.com/firebase/firebase-js-sdk/issues/6105)) - Changing UpdateData<T> to expand support for types with index signatures.

### Patch Changes

- [`aaf3fa396`](https://github.com/firebase/firebase-js-sdk/commit/aaf3fa3969521c540c4a4583648536348033e1c6) [#7385](https://github.com/firebase/firebase-js-sdk/pull/7385) - Fix an issue where localCache is not copied as part of Settings.

- [`d86c89f9c`](https://github.com/firebase/firebase-js-sdk/commit/d86c89f9c65203842eed39699c729f841d902cc0) [#7382](https://github.com/firebase/firebase-js-sdk/pull/7382) - Fix source maps that incorrectly referenced yet another minified and mangled bundle, rendering them useless. The fixed bundles' source maps are: index.esm2017.js, index.cjs.js, index.node.mjs, and index.browser.esm2017.js (lite sdk only).

## 3.13.0

### Minor Changes

- [`59c7b5801`](https://github.com/firebase/firebase-js-sdk/commit/59c7b580167509b8346e5eded82d9a4358893cd8) [#7356](https://github.com/firebase/firebase-js-sdk/pull/7356) - Expose the MultiDB API for Public Preview. [#7356](https://github.com/firebase/firebase-js-sdk/pull/7356)

## 3.12.2

### Patch Changes

- [`fe7da7ec3`](https://github.com/firebase/firebase-js-sdk/commit/fe7da7ec3c83c200d7a0c7b90bb6bd27654309ee) [#7339](https://github.com/firebase/firebase-js-sdk/pull/7339) (fixes [#7331](https://github.com/firebase/firebase-js-sdk/issues/7331)) - Fix potentially false warning message.

## 3.12.1

### Patch Changes

- Updated dependencies [[`23581c540`](https://github.com/firebase/firebase-js-sdk/commit/23581c54065f6b14a150ef579b71410842ac8518)]:
  - @firebase/webchannel-wrapper@0.10.1

## 3.12.0

### Minor Changes

- [`e45fea9b8`](https://github.com/firebase/firebase-js-sdk/commit/e45fea9b8ce2c284c5e147fd3ac2174087fbba09) [#7236](https://github.com/firebase/firebase-js-sdk/pull/7236) - Enabled long-polling networking mode auto detection by default. It can be explicitly disabled by setting `FirestoreSettings.experimentalForceLongPolling` to `false`.

- [`8051e4a99`](https://github.com/firebase/firebase-js-sdk/commit/8051e4a99e199e5cc8e6ff51a1a1116e4a56337b) [#7176](https://github.com/firebase/firebase-js-sdk/pull/7176) - Added the ability to configure the long-polling hanging get request timeout using the new `experimentalLongPollingOptions.timeoutSeconds` setting

## 3.11.0

### Minor Changes

- [`253b998fc`](https://github.com/firebase/firebase-js-sdk/commit/253b998fcfcd79327c2f7940d5435e36622215fc) [#6943](https://github.com/firebase/firebase-js-sdk/pull/6943) - Introduces a new LRU garbage document collector for memory cache.

- [`98abcd5ed`](https://github.com/firebase/firebase-js-sdk/commit/98abcd5ed9bbc5910c1a94f0580f1ceffe95e564) [#7229](https://github.com/firebase/firebase-js-sdk/pull/7229) - Implemented an optimization in the local cache synchronization logic that reduces the number of billed document reads when documents were deleted on the server while the client was not actively listening to the query (e.g. while the client was offline).

### Patch Changes

- [`a57a2b5d4`](https://github.com/firebase/firebase-js-sdk/commit/a57a2b5d4512ecd65e634958a3ede60c15f27e0c) [#7139](https://github.com/firebase/firebase-js-sdk/pull/7139) - Fixed stack overflow caused by deeply nested server timestamps.

- [`510c9b520`](https://github.com/firebase/firebase-js-sdk/commit/510c9b520e6fe158a4db169e005bd173a4563b6e) [#7170](https://github.com/firebase/firebase-js-sdk/pull/7170) - Simplified the internal handling of aggregation results.

- Updated dependencies [[`5e5c41225`](https://github.com/firebase/firebase-js-sdk/commit/5e5c41225869a5b3f315f2440d382ab010ba2e39), [`98abcd5ed`](https://github.com/firebase/firebase-js-sdk/commit/98abcd5ed9bbc5910c1a94f0580f1ceffe95e564)]:
  - @firebase/webchannel-wrapper@0.10.0

## 3.10.1

### Patch Changes

- [`b66908df6`](https://github.com/firebase/firebase-js-sdk/commit/b66908df6f280b4f7bfce984e07c169d426c990b) [#7212](https://github.com/firebase/firebase-js-sdk/pull/7212) (fixes [#7198](https://github.com/firebase/firebase-js-sdk/issues/7198)) - Fix a bug that sometimes prevented aggregations from being run when multi-tab persistence was enabled.

## 3.10.0

### Minor Changes

- [`60a730e37`](https://github.com/firebase/firebase-js-sdk/commit/60a730e37cb9b8f2260cfe4d8e3875018639a4b0) [#7015](https://github.com/firebase/firebase-js-sdk/pull/7015) - Introduces a new way to config Firestore SDK Cache.

### Patch Changes

- [`7d23aa4bd`](https://github.com/firebase/firebase-js-sdk/commit/7d23aa4bd1e29d2c10c771c0ab7919b6c5dd2d9b) [#7130](https://github.com/firebase/firebase-js-sdk/pull/7130) - Check that DOMException exists before referencing it, to fix react-native, which was broken by https://github.com/firebase/firebase-js-sdk/pull/7019 in v9.17.2.

- [`ce79f7fe2`](https://github.com/firebase/firebase-js-sdk/commit/ce79f7fe21c27d88621cecce99bb8b14b4117b36) [#7100](https://github.com/firebase/firebase-js-sdk/pull/7100) - Remove the deprecated gapi.auth from FirstPartyToken.

## 3.9.0

### Minor Changes

- [`5ba524313`](https://github.com/firebase/firebase-js-sdk/commit/5ba524313bdeddb012c44b1b1161c9229396b195) [#7053](https://github.com/firebase/firebase-js-sdk/pull/7053) - Add support for disjunctions in queries (OR queries).

### Patch Changes

- [`e2bf2eca2`](https://github.com/firebase/firebase-js-sdk/commit/e2bf2eca21308670c73d6c642a88c06f0b87d44a) [#7076](https://github.com/firebase/firebase-js-sdk/pull/7076) - Improved debug logging of networking abstractions

- [`5099f0f60`](https://github.com/firebase/firebase-js-sdk/commit/5099f0f60a5198b48942e8b2a574505432bdc213) [#6899](https://github.com/firebase/firebase-js-sdk/pull/6899) (fixes [#6509](https://github.com/firebase/firebase-js-sdk/issues/6509)) - Check navigator.userAgent, in addition to navigator.appVersion, when determining whether to work around an IndexedDb bug in Safari.

## 3.8.4

### Patch Changes

- [`36558bd2e`](https://github.com/firebase/firebase-js-sdk/commit/36558bd2e68e1ba3fb31d85ef997ab9ddf692d50) [#7024](https://github.com/firebase/firebase-js-sdk/pull/7024) - Relaxing query validation performed by the SDK

- [`b5f86b1a3`](https://github.com/firebase/firebase-js-sdk/commit/b5f86b1a305b3067fed12b024938f0c3f47de2ef) [#7018](https://github.com/firebase/firebase-js-sdk/pull/7018) - Internal refactor of platform-specific logic to create TextEncoder and TextDecoder objects.

- [`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6) [#7019](https://github.com/firebase/firebase-js-sdk/pull/7019) - Modify base64 decoding logic to throw on invalid input, rather than silently truncating it.

- [`67c5a0dc5`](https://github.com/firebase/firebase-js-sdk/commit/67c5a0dc55237391afceb956280cb04cfeaac66f) [#6952](https://github.com/firebase/firebase-js-sdk/pull/6952) - Refactoring the aggregation implementation to support future aggregate functions.

- [`b30186ffc`](https://github.com/firebase/firebase-js-sdk/commit/b30186ffc15cd441521c8f43d3f9a7a4e9ce8820) [#7058](https://github.com/firebase/firebase-js-sdk/pull/7058) - Fix unimplemented error when loading bundles

- Updated dependencies [[`c59f537b1`](https://github.com/firebase/firebase-js-sdk/commit/c59f537b1262b5d7997291b8c1e9324d378effb6)]:
  - @firebase/util@1.9.3
  - @firebase/component@0.6.4

## 3.8.3

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

- Updated dependencies [[`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30)]:
  - @firebase/util@1.9.2
  - @firebase/component@0.6.3

## 3.8.2

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

- [`27b5e7d70`](https://github.com/firebase/firebase-js-sdk/commit/27b5e7d7081688599fc518b329a43db4319cdd1f) [#6989](https://github.com/firebase/firebase-js-sdk/pull/6989) - Reduce memory usage by applying query check sooner in remote document cache.

- Updated dependencies [[`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5)]:
  - @firebase/util@1.9.1
  - @firebase/component@0.6.2

## 3.8.1

### Patch Changes

- [`a7622d49f`](https://github.com/firebase/firebase-js-sdk/commit/a7622d49f8a69bcdfb95b89dd1609a5c495fd529) [#6896](https://github.com/firebase/firebase-js-sdk/pull/6896) - Update canonifyFilter to compute the canonization for flat conjunctions the same as implicit AND queries.

- [`1455bfa43`](https://github.com/firebase/firebase-js-sdk/commit/1455bfa4393383ab461de35ccbc2b171f92169df) [#6893](https://github.com/firebase/firebase-js-sdk/pull/6893) - Fix an issue that stops some performance optimization being applied.

- [`37f31c57b`](https://github.com/firebase/firebase-js-sdk/commit/37f31c57b62bc6486bc08d9e5c64e2c32d25cb0a) [#6879](https://github.com/firebase/firebase-js-sdk/pull/6879) (fixes [#6851](https://github.com/firebase/firebase-js-sdk/issues/6851)) - Fix documentation for getDocsFromCache.

- Updated dependencies [[`d4114a4f7`](https://github.com/firebase/firebase-js-sdk/commit/d4114a4f7da3f469c0c900416ac8beee58885ec3), [`06dc1364d`](https://github.com/firebase/firebase-js-sdk/commit/06dc1364d7560f4c563e1ccc89af9cad4cd91df8)]:
  - @firebase/util@1.9.0
  - @firebase/component@0.6.1

## 3.8.0

### Minor Changes

- [`ab3f16cba`](https://github.com/firebase/firebase-js-sdk/commit/ab3f16cbabc420fab0a322a21c9e28d3cbed4f24) [#6796](https://github.com/firebase/firebase-js-sdk/pull/6796) - Upgrade TypeScript to 4.7.4 (was 4.2.2)

- [`fde5adf63`](https://github.com/firebase/firebase-js-sdk/commit/fde5adf638dae4714ff7f25c75e475344907e05e) [#6694](https://github.com/firebase/firebase-js-sdk/pull/6694) - Functions in the Firestore package that return QueryConstraints (for example: `where(...)`, `limit(...)`, and `orderBy(...)`)
  now return a more specific type, which extends QueryConstraint. Refactoring and code that supports future features is also
  included in this release.

### Patch Changes

- Updated dependencies [[`c20633ed3`](https://github.com/firebase/firebase-js-sdk/commit/c20633ed35056cbadc9d65d9ceddf4e28d1ea666), [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be)]:
  - @firebase/util@1.8.0
  - @firebase/component@0.6.0
  - @firebase/logger@0.4.0
  - @firebase/webchannel-wrapper@0.9.0

## 3.7.3

### Patch Changes

- [`bf7cc8f69`](https://github.com/firebase/firebase-js-sdk/commit/bf7cc8f691f7a17730b071d3d9c27bd28a6e3980) [#6712](https://github.com/firebase/firebase-js-sdk/pull/6712) (fixes [#6613](https://github.com/firebase/firebase-js-sdk/issues/6613)) - Fix "missing index" error message to include the link to create the composite index.

- [`e2a90bf67`](https://github.com/firebase/firebase-js-sdk/commit/e2a90bf678eb6fa505f8b2f627e03cff622607b5) [#6729](https://github.com/firebase/firebase-js-sdk/pull/6729) - Fix transaction.set() failure without retry on "already-exists" error.

## 3.7.2

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

- Updated dependencies [[`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5)]:
  - @firebase/component@0.5.21
  - @firebase/logger@0.3.4
  - @firebase/util@1.7.3
  - @firebase/webchannel-wrapper@0.8.1

## 3.7.1

### Patch Changes

- Updated dependencies [[`807f06aa2`](https://github.com/firebase/firebase-js-sdk/commit/807f06aa26438a91aaea08fd38efb6c706bb8a5d)]:
  - @firebase/util@1.7.2
  - @firebase/component@0.5.20

## 3.7.0

### Minor Changes

- [`397317b53`](https://github.com/firebase/firebase-js-sdk/commit/397317b53c4d9d8aee761f566adf3616aef844ed) [#6643](https://github.com/firebase/firebase-js-sdk/pull/6643) - Set withCredentials=true when making requests via non-streaming RPCs, like is done for streaming RPCs.

### Patch Changes

- [`0a112bd2a`](https://github.com/firebase/firebase-js-sdk/commit/0a112bd2aee2e709d6733b1a36876e6fae1e347f) [#6624](https://github.com/firebase/firebase-js-sdk/pull/6624) (fixes [#5873](https://github.com/firebase/firebase-js-sdk/issues/5873)) - Fix Firestore failing to raise initial snapshot from empty local cache result

* [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561) [#6673](https://github.com/firebase/firebase-js-sdk/pull/6673) - Handle IPv6 addresses in emulator autoinit.

* Updated dependencies [[`397317b53`](https://github.com/firebase/firebase-js-sdk/commit/397317b53c4d9d8aee761f566adf3616aef844ed), [`171b78b76`](https://github.com/firebase/firebase-js-sdk/commit/171b78b762826a640d267dd4dd172ad9459c4561), [`29d034072`](https://github.com/firebase/firebase-js-sdk/commit/29d034072c20af394ce384e42aa10a37d5dfcb18)]:
  - @firebase/webchannel-wrapper@0.8.0
  - @firebase/util@1.7.1
  - @firebase/component@0.5.19

## 3.6.0

### Minor Changes

- [`e35db6f95`](https://github.com/firebase/firebase-js-sdk/commit/e35db6f955f1b712ff67a991d8291352f28708e2) [#6597](https://github.com/firebase/firebase-js-sdk/pull/6597) - Implement count query for internal use.

* [`ee871fc0b`](https://github.com/firebase/firebase-js-sdk/commit/ee871fc0b157e1a186c2895b4290d70c8d1b986f) [#6608](https://github.com/firebase/firebase-js-sdk/pull/6608) - Added `getCountFromServer()` (`getCount()` in the Lite SDK), which fetches the number of documents in the result set without actually downloading the documents.

### Patch Changes

- [`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4) [#6526](https://github.com/firebase/firebase-js-sdk/pull/6526) - Add functionality to auto-initialize project config and emulator settings from global defaults provided by framework tooling.

* [`c6ba6fc0f`](https://github.com/firebase/firebase-js-sdk/commit/c6ba6fc0f44178d56fe165f71a798663516a2904) [#6619](https://github.com/firebase/firebase-js-sdk/pull/6619) - Fix a time travel issue across multiple tabs

* Updated dependencies [[`fdd4ab464`](https://github.com/firebase/firebase-js-sdk/commit/fdd4ab464b59a107bdcc195df3f01e32efd89ed4)]:
  - @firebase/util@1.7.0
  - @firebase/component@0.5.18

## 3.5.0

### Minor Changes

- [`7c0c640a4`](https://github.com/firebase/firebase-js-sdk/commit/7c0c640a446c729ac66fec27dfd77d6398a468db) [#6107](https://github.com/firebase/firebase-js-sdk/pull/6107) - Enable encodeInitMessageHeaders. This transitions the Firestore client from encoding HTTP Headers via the Query Param to the request's POST payload.

  Requires Cloud Firestore Emulator v1.14.4 or newer.

### Patch Changes

- Updated dependencies [[`7c0c640a4`](https://github.com/firebase/firebase-js-sdk/commit/7c0c640a446c729ac66fec27dfd77d6398a468db)]:
  - @firebase/webchannel-wrapper@0.7.0

## 3.4.15

### Patch Changes

- [`b993aeec4`](https://github.com/firebase/firebase-js-sdk/commit/b993aeec4a8f5188d1f53d07808da079f3ade846) [#6550](https://github.com/firebase/firebase-js-sdk/pull/6550) (fixes [#5871](https://github.com/firebase/firebase-js-sdk/issues/5871)) - Fix FAILED_PRECONDITION when writing to a deleted document in a transaction (#5871)

## 3.4.14

### Patch Changes

- [`f5426a512`](https://github.com/firebase/firebase-js-sdk/commit/f5426a51275bb611a5d9a6df3200d0fe5095afa2) [#6403](https://github.com/firebase/firebase-js-sdk/pull/6403) - Add internal implementation of setIndexConfiguration

* [`10765511f`](https://github.com/firebase/firebase-js-sdk/commit/10765511f7ba33293f7a15af1f98d69a261c019d) [#6496](https://github.com/firebase/firebase-js-sdk/pull/6496) - Expose client side indexing feature with `setIndexConfiguration`.

## 3.4.13

### Patch Changes

- [`1703bb31a`](https://github.com/firebase/firebase-js-sdk/commit/1703bb31afa806087167079641af79c9293ab423) [#6442](https://github.com/firebase/firebase-js-sdk/pull/6442) (fixes [#6438](https://github.com/firebase/firebase-js-sdk/issues/6438)) - Update `@grpc/proto-loader` and `firebase-admin` dependencies to address `protobufjs` security issue.

## 3.4.12

### Patch Changes

- [`ad773fa45`](https://github.com/firebase/firebase-js-sdk/commit/ad773fa451b13f9d58b3f27f7ec6570117b0cc27) [#6418](https://github.com/firebase/firebase-js-sdk/pull/6418) (fixes [#6414](https://github.com/firebase/firebase-js-sdk/issues/6414)) - Fix Node ESM export paths for firestore/lite.

- Updated dependencies [[`b12af44a5`](https://github.com/firebase/firebase-js-sdk/commit/b12af44a5c7500e1192d6cc1a4afc4d77efadbaf)]:
  - @firebase/util@1.6.3
  - @firebase/component@0.5.17

## 3.4.11

### Patch Changes

- Updated dependencies [[`efe2000fc`](https://github.com/firebase/firebase-js-sdk/commit/efe2000fc499e2c85c4e5e0fef6741ff3bad2eb0)]:
  - @firebase/util@1.6.2
  - @firebase/component@0.5.16

## 3.4.10

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

* [`d4b52b612`](https://github.com/firebase/firebase-js-sdk/commit/d4b52b612cf73610c57a3c08a0415ab7b622a70a) [#6321](https://github.com/firebase/firebase-js-sdk/pull/6321) - Fix incorrect paths in package.json

* Updated dependencies [[`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5)]:
  - @firebase/component@0.5.15
  - @firebase/logger@0.3.3
  - @firebase/util@1.6.1
  - @firebase/webchannel-wrapper@0.6.2

## 3.4.9

### Patch Changes

- [`dfab18af6`](https://github.com/firebase/firebase-js-sdk/commit/dfab18af66beeed14b2524f926af5bda506856a6) [#6189](https://github.com/firebase/firebase-js-sdk/pull/6189) - Add `TransactionOptions` param to `runTransaction` method

- Updated dependencies [[`9c5c9c36d`](https://github.com/firebase/firebase-js-sdk/commit/9c5c9c36da80b98b73cfd60ef2e2965087e9f801)]:
  - @firebase/util@1.6.0
  - @firebase/component@0.5.14

## 3.4.8

### Patch Changes

- [`05dc9d6a0`](https://github.com/firebase/firebase-js-sdk/commit/05dc9d6a0db3058611dd7a2dc34daa726f9ba20d) [#6128](https://github.com/firebase/firebase-js-sdk/pull/6128) (fixes [#6110](https://github.com/firebase/firebase-js-sdk/issues/6110)) - Fixes an issue during multi-document lookup that resulted in the IndexedDB error "The parameter is less than or equal to this cursor's".

- Updated dependencies [[`e9e5f6b3c`](https://github.com/firebase/firebase-js-sdk/commit/e9e5f6b3ca9d61323b22f87986d9959f5297ec59)]:
  - @firebase/util@1.5.2
  - @firebase/component@0.5.13

## 3.4.7

### Patch Changes

- [`69aa7b02d`](https://github.com/firebase/firebase-js-sdk/commit/69aa7b02df3b4d1f9832b7713951936b6bf32ca9) [#5988](https://github.com/firebase/firebase-js-sdk/pull/5988) - The format of some of the IndexedDB data changed. This increases the performance of document lookups after an initial migration. If you do not want to migrate data, you can call `clearIndexedDbPersistence()` before invoking `enableIndexedDbPersistence()`.

- Updated dependencies [[`3198d58dc`](https://github.com/firebase/firebase-js-sdk/commit/3198d58dcedbf7583914dbcc76984f6f7df8d2ef)]:
  - @firebase/util@1.5.1
  - @firebase/component@0.5.12

## 3.4.6

### Patch Changes

- Updated dependencies [[`2d672cead`](https://github.com/firebase/firebase-js-sdk/commit/2d672cead167187cb714cd89b638c0884ba58f03)]:
  - @firebase/util@1.5.0
  - @firebase/component@0.5.11

## 3.4.5

### Patch Changes

- [`bb8f37c3e`](https://github.com/firebase/firebase-js-sdk/commit/bb8f37c3e83e73876d14fa751cb04ae5e1367394) [#5993](https://github.com/firebase/firebase-js-sdk/pull/5993) - Fixed a bug that caused Firestore streams to get restarted with the same App Check token.

* [`f5ac47fb1`](https://github.com/firebase/firebase-js-sdk/commit/f5ac47fb1a44f7b985fcae1d934e1ffb6ba41d67) [#5982](https://github.com/firebase/firebase-js-sdk/pull/5982) - On browsers that support IndexedDB V3, we now invoke `transaction.commit()` to speed up data processing.

- [`c1b9cf120`](https://github.com/firebase/firebase-js-sdk/commit/c1b9cf1201807fc177a89c9613c06130524563e4) [#5985](https://github.com/firebase/firebase-js-sdk/pull/5985) - Some database operations now use `IndexedDB.getAll()` on browsers where support is available.

* [`e9619685b`](https://github.com/firebase/firebase-js-sdk/commit/e9619685b9153f7d6f8767e09e2e1eacc337df76) [#5980](https://github.com/firebase/firebase-js-sdk/pull/5980) - Queries are now send to the backend before the SDK starts local processing, which reduces overall Query latency.

## 3.4.4

### Patch Changes

- [`e28b0e413`](https://github.com/firebase/firebase-js-sdk/commit/e28b0e413decb115c846a7b5ed1e63dbf55c56ab) [#5902](https://github.com/firebase/firebase-js-sdk/pull/5902) (fixes [#5842](https://github.com/firebase/firebase-js-sdk/issues/5842)) - Fixed an AppCheck issue that caused Firestore listeners to stop working and
  receive a "Permission Denied" error. This issue only occurred for AppCheck users
  that set their expiration time to under an hour.

* [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

## 3.4.3

### Patch Changes

- [`044a8d7f9`](https://github.com/firebase/firebase-js-sdk/commit/044a8d7f95a0ba0d34123ff5fd7a4bcb1bd3d328) [#5830](https://github.com/firebase/firebase-js-sdk/pull/5830) (fixes [#5823](https://github.com/firebase/firebase-js-sdk/issues/5823)) - Fix Proto loading for Vercel/Next.js.

* [`ff2f7d4c8`](https://github.com/firebase/firebase-js-sdk/commit/ff2f7d4c85c0bda94b14d66237faa0e5da93bfa4) [#5883](https://github.com/firebase/firebase-js-sdk/pull/5883) - The Node SDK now uses JSON to load its internal Protobuf definition, which allows the Node SDK to work with bundlers such as Rollup and Webpack.

## 3.4.2

### Patch Changes

- [`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49) [#5831](https://github.com/firebase/firebase-js-sdk/pull/5831) (fixes [#5754](https://github.com/firebase/firebase-js-sdk/issues/5754)) - FirestoreError and StorageError now extend FirebaseError

* [`7f05d22e8`](https://github.com/firebase/firebase-js-sdk/commit/7f05d22e827f1fd0732ad33fda203a20566d3964) [#5835](https://github.com/firebase/firebase-js-sdk/pull/5835) - Fixed an issue that can cause incomplete Query snapshots when the SDK is backgrounded during query execution.

* Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49)]:
  - @firebase/util@1.4.3
  - @firebase/component@0.5.10

## 3.4.1

### Patch Changes

- [`fd8cd3ec4`](https://github.com/firebase/firebase-js-sdk/commit/fd8cd3ec4b7d0747fca258d468ee094573a08bbb) [#5809](https://github.com/firebase/firebase-js-sdk/pull/5809) - Hardcode grpc-js version as a temporary fix for `createRequire` issues in Node CJS.

* [`8298cf8a9`](https://github.com/firebase/firebase-js-sdk/commit/8298cf8a9343dbba6c628d64941dfbe5d17c44aa) [#5741](https://github.com/firebase/firebase-js-sdk/pull/5741) - fix firestore node tests

## 3.4.0

### Minor Changes

- [`086df7c7e`](https://github.com/firebase/firebase-js-sdk/commit/086df7c7e0299cedd9f3cff9080f46ca25cab7cd) [#5634](https://github.com/firebase/firebase-js-sdk/pull/5634) - AppCheck integration for Firestore

## 3.3.1

### Patch Changes

- [`7a5bc84bd`](https://github.com/firebase/firebase-js-sdk/commit/7a5bc84bd84a8d1b422204f30a59f06d5b60f1bd) [#5717](https://github.com/firebase/firebase-js-sdk/pull/5717) (fixes [#5716](https://github.com/firebase/firebase-js-sdk/issues/5716)) - The SDK no longer accesses IndexedDB during a page unload event on Safari 15. This aims to reduce the occurrence of an IndexedDB bug in Safari (https://bugs.webkit.org/show_bug.cgi?id=226547).

* [`ce39a1a07`](https://github.com/firebase/firebase-js-sdk/commit/ce39a1a07e8710e43cc66d9e7db882f185211a9a) [#5738](https://github.com/firebase/firebase-js-sdk/pull/5738) (fixes [#5687](https://github.com/firebase/firebase-js-sdk/issues/5687)) - better meta url polyfill

## 3.3.0

### Minor Changes

- [`532b3cd93`](https://github.com/firebase/firebase-js-sdk/commit/532b3cd939c5a2c13987a21e38a0a121c5dfca04) [#5675](https://github.com/firebase/firebase-js-sdk/pull/5675) (fixes [#5661](https://github.com/firebase/firebase-js-sdk/issues/5661)) - Expanded `Firestore.WithFieldValue<T>` to include `T`. This allows developers to delegate `WithFieldValue<T>` inside wrappers of type `T` to avoid exposing Firebase types beyond Firebase-specific logic.

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a)]:
  - @firebase/component@0.5.9
  - @firebase/logger@0.3.2
  - @firebase/util@1.4.2

## 3.2.1

### Patch Changes

- Updated dependencies [[`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684)]:
  - @firebase/component@0.5.8
  - @firebase/logger@0.3.1
  - @firebase/util@1.4.1
  - @firebase/webchannel-wrapper@0.6.1

## 3.2.0

### Minor Changes

- [`4d3640481`](https://github.com/firebase/firebase-js-sdk/commit/4d36404812a7ca24ced5e1aabf6d8aa03de4e08a) [#5532](https://github.com/firebase/firebase-js-sdk/pull/5532) (fixes [#5499](https://github.com/firebase/firebase-js-sdk/issues/5499)) - Fix exports field to also point to Node ESM builds. This change requires Node.js version 10+.

### Patch Changes

- [`f48527617`](https://github.com/firebase/firebase-js-sdk/commit/f485276173ac0f6fb212328d00334892f4b33a9a) [#5668](https://github.com/firebase/firebase-js-sdk/pull/5668) - Add missing compat Firestore conversion for runTransaction

* [`c75bbe957`](https://github.com/firebase/firebase-js-sdk/commit/c75bbe9574133ce6d1487a601c7acb4204e417aa) [#5643](https://github.com/firebase/firebase-js-sdk/pull/5643) - Change the networking API to use XHR instead of `fetch()` for ReactNative.

## 3.1.1

### Patch Changes

- [`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f) [#5596](https://github.com/firebase/firebase-js-sdk/pull/5596) - report build variants for packages

## 3.1.0

### Minor Changes

- [`f78ceca1c`](https://github.com/firebase/firebase-js-sdk/commit/f78ceca1cf9198f5d371320e8814c859c261cf67) [#5394](https://github.com/firebase/firebase-js-sdk/pull/5394) - Fixed a bug where `UpdateData` did not recognize union types or optional, dot-separated string fields.

### Patch Changes

- [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39) [#5539](https://github.com/firebase/firebase-js-sdk/pull/5539) - use `constructor.name` for Object type

- Updated dependencies [[`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`456d664ae`](https://github.com/firebase/firebase-js-sdk/commit/456d664aef582fc18326ffbd418de0d7d3ef86b7), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422)]:
  - @firebase/logger@0.3.0
  - @firebase/util@1.4.0
  - @firebase/webchannel-wrapper@0.6.0
  - @firebase/component@0.5.7

## 3.0.2

### Patch Changes

- [`8180a2b77`](https://github.com/firebase/firebase-js-sdk/commit/8180a2b77d331c4d01a000e35f51dc61af660eb7) [#5396](https://github.com/firebase/firebase-js-sdk/pull/5396) - Improved the error handling when opening IndexedDb fails in a Firefox private browsing session.

* [`b8462f248`](https://github.com/firebase/firebase-js-sdk/commit/b8462f2489fb6f37691b136c9a5d453207dccc06) [#5434](https://github.com/firebase/firebase-js-sdk/pull/5434) - Fixes a deadlock during asynchronous initialization of both Firestore and Auth.

- [`bf5772f64`](https://github.com/firebase/firebase-js-sdk/commit/bf5772f645207c24f3218914d27fdbe4e76584a2) [#5440](https://github.com/firebase/firebase-js-sdk/pull/5440) - Fix the implementation of `collection()` with multiple path segments.

* [`dca28a10d`](https://github.com/firebase/firebase-js-sdk/commit/dca28a10dac4409c84d5a991094f7b5a4f3e5c7f) [#5461](https://github.com/firebase/firebase-js-sdk/pull/5461) - Temporary fix for a bug causing `initializeFirestore()` to not work with certain bundling pipelines.

## 3.0.1

### Patch Changes

- [`cd15df0d1`](https://github.com/firebase/firebase-js-sdk/commit/cd15df0d1f51110f448e4284244b06be8d37f1c3) [#5400](https://github.com/firebase/firebase-js-sdk/pull/5400) (fixes [#2903](https://github.com/firebase/firebase-js-sdk/issues/2903)) - Make firestore/lite available in nodejs

* [`6163bb282`](https://github.com/firebase/firebase-js-sdk/commit/6163bb282b4e3b6fe5f405c3b3e35d5691d41677) [#5399](https://github.com/firebase/firebase-js-sdk/pull/5399) - Addressed incorrect use of the `node-fetch` polyfill

## 3.0.0

### Major Changes

- [`5bc6afb75`](https://github.com/firebase/firebase-js-sdk/commit/5bc6afb75b5267bad5940c32458c315e5394321d) [#5268](https://github.com/firebase/firebase-js-sdk/pull/5268) (fixes [#4277](https://github.com/firebase/firebase-js-sdk/issues/4277)) - This change contains multiple quality-of-life improvements when using the `FirestoreDataConverter` in `@firebase/firestore/lite` and `@firebase/firestore`:
  - Support for passing in `FieldValue` property values when using a converter (via `WithFieldValue<T>` and `PartialWithFieldValue<T>`).
  - Support for omitting properties in nested fields when performing a set operation with `{merge: true}` with a converter (via `PartialWithFieldValue<T>`).
  - Support for typed update operations when using a converter (via the newly typed `UpdateData`). Improperly typed fields in
    update operations on typed document references will no longer compile.

* [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 2.4.0

### Minor Changes

- [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131) [#5282](https://github.com/firebase/firebase-js-sdk/pull/5282) - Implement mockUserToken for Storage and fix JWT format bugs.

### Patch Changes

- [`f825b1d83`](https://github.com/firebase/firebase-js-sdk/commit/f825b1d83228747e404aaefd9f3948d12257d0fc) [#5288](https://github.com/firebase/firebase-js-sdk/pull/5288) - Fixed a regression that prevented the garbage collector from running if multi-tab was disabled.

- Updated dependencies [[`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - @firebase/component@0.5.6
  - @firebase/firestore-types@2.4.0
  - @firebase/util@1.3.0

## 2.3.10

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5

## 2.3.9

### Patch Changes

- [`b51be1da3`](https://github.com/firebase/firebase-js-sdk/commit/b51be1da318a8f79ff159bcb8be9797d192519fd) [#5166](https://github.com/firebase/firebase-js-sdk/pull/5166) (fixes [#4076](https://github.com/firebase/firebase-js-sdk/issues/4076)) - The SDK no longer accesses IndexedDB during a page unload event on Safari 14. This aims to reduce the occurrence of an IndexedDB bug in Safari (https://bugs.webkit.org/show_bug.cgi?id=226547).

* [`2cd9d7c39`](https://github.com/firebase/firebase-js-sdk/commit/2cd9d7c394dd0c84f285fbcfa4b0a5d79509451f) [#5147](https://github.com/firebase/firebase-js-sdk/pull/5147) (fixes [#5047](https://github.com/firebase/firebase-js-sdk/issues/5047)) - Fixed an issue that prevented Timestamps from being used via `update()` when connected to the Emulator

## 2.3.8

### Patch Changes

- Updated dependencies [[`85f73abb5`](https://github.com/firebase/firebase-js-sdk/commit/85f73abb5c5dd5625c82b874adbfbb4acd1d70d7), [`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - @firebase/webchannel-wrapper@0.5.1
  - @firebase/component@0.5.4

## 2.3.7

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3

## 2.3.6

### Patch Changes

- [`1d54447ca`](https://github.com/firebase/firebase-js-sdk/commit/1d54447ca928ab50228600858978bb3b341c0507) [#5010](https://github.com/firebase/firebase-js-sdk/pull/5010) - Fixes a regression that prevented Firestore from detecting Auth during its initial initialization, which could cause some writes to not be send.
  [4971](https://github.com/firebase/firebase-js-sdk/pull/4971) didn't actually fix it.

## 2.3.5

### Patch Changes

- [`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b) [#4971](https://github.com/firebase/firebase-js-sdk/pull/4971) - Fixes a regression that prevented Firestore from detecting Auth during its initial initialization, which could cause some writes to not be send.

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2

## 2.3.4

### Patch Changes

- Updated dependencies [[`10fb5b87f`](https://github.com/firebase/firebase-js-sdk/commit/10fb5b87faecf3aa79e15545b21de99af3e51a71)]:
  - @firebase/webchannel-wrapper@0.5.0

## 2.3.3

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19)]:
  - @firebase/component@0.5.1

## 2.3.2

### Patch Changes

- [`169174520`](https://github.com/firebase/firebase-js-sdk/commit/169174520f6451f5741fd50e8957d4097895e97a) [#4929](https://github.com/firebase/firebase-js-sdk/pull/4929) - Added a warning message when the host settings are overridden without `{merge: true}`.

## 2.3.1

### Patch Changes

- [`96a47097f`](https://github.com/firebase/firebase-js-sdk/commit/96a47097f36fa33f16b3f63b8cc72d256710e528) [#4886](https://github.com/firebase/firebase-js-sdk/pull/4886) - Use 'pagehide' for page termination by default.

## 2.3.0

### Minor Changes

- [`97f61e6f3`](https://github.com/firebase/firebase-js-sdk/commit/97f61e6f3d24e5b4c92ed248bb531233a94b9eaf) [#4837](https://github.com/firebase/firebase-js-sdk/pull/4837) (fixes [#4715](https://github.com/firebase/firebase-js-sdk/issues/4715)) - Add mockUserToken support for Firestore.

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`97f61e6f3`](https://github.com/firebase/firebase-js-sdk/commit/97f61e6f3d24e5b4c92ed248bb531233a94b9eaf), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - @firebase/firestore-types@2.3.0
  - @firebase/util@1.1.0

## 2.2.5

### Patch Changes

- [`633463e2a`](https://github.com/firebase/firebase-js-sdk/commit/633463e2abfdef7dbb6d9bf5275df21d6a01fcb6) [#4788](https://github.com/firebase/firebase-js-sdk/pull/4788) - Ensure that errors get wrapped in FirestoreError

* [`c65883680`](https://github.com/firebase/firebase-js-sdk/commit/c658836806e0a5fef11fa61cd68f98960567f31b) [#4810](https://github.com/firebase/firebase-js-sdk/pull/4810) (fixes [#4795](https://github.com/firebase/firebase-js-sdk/issues/4795)) - Don't send empty X-Firebase-GMPID header when AppId is not set in FirebaseOptions

## 2.2.4

### Patch Changes

- [`6db185be5`](https://github.com/firebase/firebase-js-sdk/commit/6db185be5ed297ba2a8b6c0a098319131da7b552) [#4745](https://github.com/firebase/firebase-js-sdk/pull/4745) - Fixed a bug where decimal inputs to `Timestamp.fromMillis()` calculated incorrectly due to floating point precision loss

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda)]:
  - @firebase/util@1.0.0
  - @firebase/component@0.4.1

## 2.2.3

### Patch Changes

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0

## 2.2.2

### Patch Changes

- [`4cb0945c6`](https://github.com/firebase/firebase-js-sdk/commit/4cb0945c6e7d9ba729d34f893942f039443346aa) [#3888](https://github.com/firebase/firebase-js-sdk/pull/3888) - Added new internal HTTP header to all network requests.

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - @firebase/component@0.3.1

## 2.2.1

### Patch Changes

- [`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3) [#4595](https://github.com/firebase/firebase-js-sdk/pull/4595) - Component factory now takes an options object. And added `Provider.initialize()` that can be used to pass an options object to the component factory.

- Updated dependencies [[`5c1a83ed7`](https://github.com/firebase/firebase-js-sdk/commit/5c1a83ed70bae979322bd8751c0885d683ce4bf3)]:
  - @firebase/component@0.3.0

## 2.2.0

### Minor Changes

- [`b6080a857`](https://github.com/firebase/firebase-js-sdk/commit/b6080a857b1b56e10db041e6357acd69154e31fb) [#4577](https://github.com/firebase/firebase-js-sdk/pull/4577) - Added support to remove a FirestoreDataConverter on a Firestore reference by calling `withConverter(null)`

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e), [`b6080a857`](https://github.com/firebase/firebase-js-sdk/commit/b6080a857b1b56e10db041e6357acd69154e31fb)]:
  - @firebase/util@0.4.0
  - @firebase/firestore-types@2.2.0
  - @firebase/component@0.2.1

## 2.1.7

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 2.1.6

### Patch Changes

- [`a718518e9`](https://github.com/firebase/firebase-js-sdk/commit/a718518e935931709669ea2e88f9711143655e61) [#4395](https://github.com/firebase/firebase-js-sdk/pull/4395) - Fixes a bug where local cache inconsistencies were unnecessarily being resolved.

* [`3d0cd6f33`](https://github.com/firebase/firebase-js-sdk/commit/3d0cd6f33127e75e15aec9b6589eea360827df7a) [#4382](https://github.com/firebase/firebase-js-sdk/pull/4382) - Fix the path to the react native build for the Firestore memory build

## 2.1.5

### Patch Changes

- [`9533688b1`](https://github.com/firebase/firebase-js-sdk/commit/9533688b1e39e58a550ec0527a0363270d73c5b5) [#4347](https://github.com/firebase/firebase-js-sdk/pull/4347) (fixes [#1392](https://github.com/firebase/firebase-js-sdk/issues/1392)) - handle `ignoreUndefinedProperties` in `set({ merge: true })`. Previously this would behave as if the undefined value were `FieldValue.delete()`, which wasn't intended.

## 2.1.4

### Patch Changes

- [`749c7f3d9`](https://github.com/firebase/firebase-js-sdk/commit/749c7f3d985f978cd2a204cbc28c3fff09458b5b) [#4298](https://github.com/firebase/firebase-js-sdk/pull/4298) (fixes [#4258](https://github.com/firebase/firebase-js-sdk/issues/4258)) - Firestore classes like DocumentReference and Query can now be serialized to JSON (#4258)

## 2.1.3

### Patch Changes

- [`6ac66baa0`](https://github.com/firebase/firebase-js-sdk/commit/6ac66baa0e7ac8dd90a6d6136a020cdd54710df5) [#4284](https://github.com/firebase/firebase-js-sdk/pull/4284) (fixes [#4278](https://github.com/firebase/firebase-js-sdk/issues/4278)) - Fixes FirestoreDataConverter.fromFirestore() being called with an incorrect "snapshot" object.

## 2.1.2

### Patch Changes

- [`6069b1d6c`](https://github.com/firebase/firebase-js-sdk/commit/6069b1d6c521d05dde821f21bcc7e02913180ae5) [#4262](https://github.com/firebase/firebase-js-sdk/pull/4262) (fixes [#4253](https://github.com/firebase/firebase-js-sdk/issues/4253)) - Updated an outdated error message to include '!=' and 'not-in' as an inequalities.

* [`ba59a0f90`](https://github.com/firebase/firebase-js-sdk/commit/ba59a0f909a1eb59d23b887bba30b6f86d63c931) [#4233](https://github.com/firebase/firebase-js-sdk/pull/4233) (fixes [#4226](https://github.com/firebase/firebase-js-sdk/issues/4226)) - Fixes an issue in the Transaction API that caused the SDK to return invalid DocumentReferences through `DocumentSnapshot.data()` calls.

## 2.1.1

### Patch Changes

- [`44b5251d0`](https://github.com/firebase/firebase-js-sdk/commit/44b5251d0527d1aa768959765ff04093a04dd8ab) [#4189](https://github.com/firebase/firebase-js-sdk/pull/4189) (fixes [#4175](https://github.com/firebase/firebase-js-sdk/issues/4175)) - Fixes an issue that prevented the SDK from automatically retrieving custom User claims.

## 2.1.0

### Minor Changes

- [`b662f8c0a`](https://github.com/firebase/firebase-js-sdk/commit/b662f8c0a9890cbdcf53cce7fe01c2a8a52d3d2d) [#4168](https://github.com/firebase/firebase-js-sdk/pull/4168) - Release Firestore Bundles (pre-packaged Firestore data). For NPM users, this can
  be enabled via an additional import: 'firebase/firestore/bundle'. For CDN usage,
  it is enabled by default.

* [`1b5407372`](https://github.com/firebase/firebase-js-sdk/commit/1b54073726db8cefd994492d0cfba7c5f619f14b) [#4153](https://github.com/firebase/firebase-js-sdk/pull/4153) - A write to a document that contains FieldValue transforms is no longer split up into two separate operations. This reduces the number of writes the backend performs and allows each WriteBatch to hold 500 writes regardless of how many FieldValue transformations are attached.

### Patch Changes

- Updated dependencies [[`b662f8c0a`](https://github.com/firebase/firebase-js-sdk/commit/b662f8c0a9890cbdcf53cce7fe01c2a8a52d3d2d)]:
  - @firebase/firestore-types@2.1.0

## 2.0.5

### Patch Changes

- [`1849b0d0f`](https://github.com/firebase/firebase-js-sdk/commit/1849b0d0f0bbca56e50bea01979d20ada58040dc) [#4148](https://github.com/firebase/firebase-js-sdk/pull/4148) - Fixed a bug that prevented usage of FieldPaths with multiple special characters.

* [`8993f16b8`](https://github.com/firebase/firebase-js-sdk/commit/8993f16b81b4b386f2ac5195950235a6a43ed9bc) [#4136](https://github.com/firebase/firebase-js-sdk/pull/4136) (fixes [#4125](https://github.com/firebase/firebase-js-sdk/issues/4125)) - Fixes an issue that returned invalid `DocumentReference`s in `QuerySnapshot`s.

## 2.0.4

### Patch Changes

- [`9822e125c`](https://github.com/firebase/firebase-js-sdk/commit/9822e125c399ae7271d4a9077f82b184a44526e4) [#4078](https://github.com/firebase/firebase-js-sdk/pull/4078) - Fix an issue that prevented `experimentalAutoDetectLongPolling` from working correctly.

- Updated dependencies [[`9822e125c`](https://github.com/firebase/firebase-js-sdk/commit/9822e125c399ae7271d4a9077f82b184a44526e4)]:
  - @firebase/webchannel-wrapper@0.4.1

## 2.0.3

### Patch Changes

- [`6c6c49ad6`](https://github.com/firebase/firebase-js-sdk/commit/6c6c49ad6b3c3d66e9ecb8397c4ac39bea256e80) [#4053](https://github.com/firebase/firebase-js-sdk/pull/4053) - Internal changes for the upcoming modular API.

* [`e0bf3f70b`](https://github.com/firebase/firebase-js-sdk/commit/e0bf3f70bf82f3587e60ab4484fe37d01cea0051) [#4080](https://github.com/firebase/firebase-js-sdk/pull/4080) (fixes [#4071](https://github.com/firebase/firebase-js-sdk/issues/4071)) - Fixes a regression introduced in v8.0.2 that returned invalid values for `DocumentChange.newIndex`.

## 2.0.2

### Patch Changes

- [`d2adf4e3e`](https://github.com/firebase/firebase-js-sdk/commit/d2adf4e3e69da3a4312828137f9721ea84b87fe2) [#4051](https://github.com/firebase/firebase-js-sdk/pull/4051) - Fixed an issue that caused `DocumentReference`s in `DocumentSnapshot`s to be returned with the custom converter of the original `DocumentReference`.

* [`6dffdf2eb`](https://github.com/firebase/firebase-js-sdk/commit/6dffdf2eb1323ec9047af4ed78302a68f7dacce3) [#3594](https://github.com/firebase/firebase-js-sdk/pull/3594) - Merge bundle loading implementation without exposing public API

- [`484e90a1d`](https://github.com/firebase/firebase-js-sdk/commit/484e90a1d8f63e04268ff5bce4e3e0873c56c8e1) [#4043](https://github.com/firebase/firebase-js-sdk/pull/4043) - Internal changes to support upcoming modular API.

## 2.0.1

### Patch Changes

- [`007ddd1eb`](https://github.com/firebase/firebase-js-sdk/commit/007ddd1eb6be0a66df7b1c3264d8dff8857d8399) [#4030](https://github.com/firebase/firebase-js-sdk/pull/4030) - Internal changes to support upcoming modular API.

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 2.0.0

### Major Changes

- [`8939aeca0`](https://github.com/firebase/firebase-js-sdk/commit/8939aeca02921f9eacf1badb1068de22f670293e) [#3944](https://github.com/firebase/firebase-js-sdk/pull/3944) - Removed the undocumented `Firestore.logLevel` property.

* [`344bd8856`](https://github.com/firebase/firebase-js-sdk/commit/344bd88566e2c42fd7ee92f28bb0f784629b48ee) [#3943](https://github.com/firebase/firebase-js-sdk/pull/3943) - Removed deprecated `experimentalTabSynchronization` settings. To enable multi-tab synchronization, use `synchronizeTabs` instead.

- [`4b540f91d`](https://github.com/firebase/firebase-js-sdk/commit/4b540f91dbad217e8ec04b382b4c724308cb3df1) [#3939](https://github.com/firebase/firebase-js-sdk/pull/3939) - This releases removes all input validation. Please use our TypeScript types to validate API usage.

* [`ffef32e38`](https://github.com/firebase/firebase-js-sdk/commit/ffef32e3837d3ee1098129b237e7a6e2e738182d) [#3897](https://github.com/firebase/firebase-js-sdk/pull/3897) (fixes [#3879](https://github.com/firebase/firebase-js-sdk/issues/3879)) - Removed the `timestampsInSnapshots` option from `FirestoreSettings`. Now, Firestore always returns `Timestamp` values for all timestamp values.

### Minor Changes

- [`79b049375`](https://github.com/firebase/firebase-js-sdk/commit/79b04937537b90422e051086112f6b43c2880cdb) [#3909](https://github.com/firebase/firebase-js-sdk/pull/3909) - Add a useEmulator(host, port) method to Firestore

* [`9719635fe`](https://github.com/firebase/firebase-js-sdk/commit/9719635fe2ecbb5b981076ce4807d0df775b8332) [#3960](https://github.com/firebase/firebase-js-sdk/pull/3960) - Removed excess validation of null and NaN values in query filters. This more closely aligns the SDK with the Firestore backend, which has always accepted null and NaN for all operators, even though this isn't necessarily useful.

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

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`79b049375`](https://github.com/firebase/firebase-js-sdk/commit/79b04937537b90422e051086112f6b43c2880cdb), [`ffef32e38`](https://github.com/firebase/firebase-js-sdk/commit/ffef32e3837d3ee1098129b237e7a6e2e738182d), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce)]:
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3
  - @firebase/firestore-types@2.0.0

## 1.18.0

### Minor Changes

- [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc) [#3724](https://github.com/firebase/firebase-js-sdk/pull/3724) - Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings. When
  enabled, the SDK's underlying transport (WebChannel) automatically detects if
  long-polling should be used. This is very similar to
  `experimentalForceLongPolling`, but only uses long-polling if required.

### Patch Changes

- [`2bea0a367`](https://github.com/firebase/firebase-js-sdk/commit/2bea0a367da8de06bae29e1459b7cbe3cdfde540) [#3919](https://github.com/firebase/firebase-js-sdk/pull/3919) - Fixed a potential issue in our internal queue that could have allowed API calls to be executed out of order.

- Updated dependencies [[`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc)]:
  - @firebase/firestore-types@1.14.0
  - @firebase/webchannel-wrapper@0.4.0

## 1.17.3

### Patch Changes

- [`a10c18f89`](https://github.com/firebase/firebase-js-sdk/commit/a10c18f8996fc35942779f5fea5690ae5d102bb0) [#3871](https://github.com/firebase/firebase-js-sdk/pull/3871) - The SDK now include more information in the error message for failed IndexedDB transactions.

## 1.17.2

### Patch Changes

- [`2be43eadf`](https://github.com/firebase/firebase-js-sdk/commit/2be43eadf756e45da7ad3ae7ba104ac5f0e557fa) [#3864](https://github.com/firebase/firebase-js-sdk/pull/3864) - Internal changes to support upcoming modular API.

## 1.17.1

### Patch Changes

- [`4dc8817c3`](https://github.com/firebase/firebase-js-sdk/commit/4dc8817c3faf172152a5b1e7778d0ce844510f97) [#3821](https://github.com/firebase/firebase-js-sdk/pull/3821) - Fixes an issue that prevents `waitForPendingWrites()` from resolving in background tabs when multi-tab is used (https://github.com/firebase/firebase-js-sdk/issues/3816).

* [`16c6ba979`](https://github.com/firebase/firebase-js-sdk/commit/16c6ba9793681f1695f855f22a19a618ceface5f) [#3820](https://github.com/firebase/firebase-js-sdk/pull/3820) (fixes [#3814](https://github.com/firebase/firebase-js-sdk/issues/3814)) - Fixes a "Comparison with -0" lint warning for customers that build from source.

## 1.17.0

### Minor Changes

- [`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9) [#3772](https://github.com/firebase/firebase-js-sdk/pull/3772) - [feature] Added `not-in` and `!=` query operators for use with `.where()`. `not-in` finds documents where a specified field’s value is not in a specified array. `!=` finds documents where a specified field's value does not equal the specified value. Neither query operator will match documents where the specified field is not present.

* [`a8ff3dbaa`](https://github.com/firebase/firebase-js-sdk/commit/a8ff3dbaacd06371e6652a6d639ef2d9bead612b) [#3418](https://github.com/firebase/firebase-js-sdk/pull/3418) - Use FirestoreError instead of Error in onSnapshot\*() error callbacks.

### Patch Changes

- [`e81c429ae`](https://github.com/firebase/firebase-js-sdk/commit/e81c429aec43cd4467089bfed68eafafba6e8ee2) [#3755](https://github.com/firebase/firebase-js-sdk/pull/3755) (fixes [#3742](https://github.com/firebase/firebase-js-sdk/issues/3742)) - Fixed a bug where CollectionReference.add() called FirestoreDataConverter.toFirestore() twice instead of once (#3742).

- Updated dependencies [[`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9), [`a8ff3dbaa`](https://github.com/firebase/firebase-js-sdk/commit/a8ff3dbaacd06371e6652a6d639ef2d9bead612b)]:
  - @firebase/firestore-types@1.13.0

## 1.16.7

### Patch Changes

- [`249d40cb6`](https://github.com/firebase/firebase-js-sdk/commit/249d40cb692366f686a50c06c44ec81e4cae23d7) [#3700](https://github.com/firebase/firebase-js-sdk/pull/3700) - Fixes a bug that caused the client to not raise snapshots from cache if a user change happened while the network connection was disabled.

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 1.16.6

### Patch Changes

- [`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3) [#3464](https://github.com/firebase/firebase-js-sdk/pull/3464) (fixes [#3354](https://github.com/firebase/firebase-js-sdk/issues/3354)) - feat: Added `merge` option to `firestore.settings()`, which merges the provided settings with
  settings from a previous call. This allows adding settings on top of the settings that were applied
  by `@firebase/testing`.
- Updated dependencies [[`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3)]:
  - @firebase/firestore-types@1.12.1

## 1.16.5

### Patch Changes

- [`960093d5b`](https://github.com/firebase/firebase-js-sdk/commit/960093d5b3ada866709c1a51b4ca175c3a01f1f3) [#3575](https://github.com/firebase/firebase-js-sdk/pull/3575) (fixes [#2755](https://github.com/firebase/firebase-js-sdk/issues/2755)) - `terminate()` can now be retried if it fails with an IndexedDB exception.

* [`b97c7e758`](https://github.com/firebase/firebase-js-sdk/commit/b97c7e758b1e2a370cb72a7aac14c17a54531a36) [#3487](https://github.com/firebase/firebase-js-sdk/pull/3487) - Enable fallback for auto-generated identifiers in environments that support `crypto` but not `crypto.getRandomValues`.

## 1.16.4

### Patch Changes

- [`36be62a8`](https://github.com/firebase/firebase-js-sdk/commit/36be62a85c3cc47c15c9a59f20cdfcd7d0a72ad9) [#3535](https://github.com/firebase/firebase-js-sdk/pull/3535) (fixes [#3495](https://github.com/firebase/firebase-js-sdk/issues/3495)) - The SDK no longer crashes with the error "The database connection is closing". Instead, the individual operations that cause this error may be rejected.

* [`68995c24`](https://github.com/firebase/firebase-js-sdk/commit/68995c2422a479d42b9c972bab3da4d544b9f002) [#3586](https://github.com/firebase/firebase-js-sdk/pull/3586) - Fixed a bug that caused slow retries for IndexedDB operations even when a webpage re-entered the foreground.

* Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 1.16.3

### Patch Changes

- Updated dependencies [[`7f0860a4`](https://github.com/firebase/firebase-js-sdk/commit/7f0860a4ced76da8492ae44d2267a2f1cc58eccb)]:
  - @firebase/webchannel-wrapper@0.3.0

## 1.16.2

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 1.16.1

### Patch Changes

- [`5a355360`](https://github.com/firebase/firebase-js-sdk/commit/5a3553609da893d45f7fe1897387f72eaedf2fe0) [#3162](https://github.com/firebase/firebase-js-sdk/pull/3162) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - The SDK no longer crashes if an IndexedDB failure occurs when unsubscribing from a Query.

* [`9a9a81fe`](https://github.com/firebase/firebase-js-sdk/commit/9a9a81fe4f001f23e9fe1db054c2e7159fca3ae3) [#3279](https://github.com/firebase/firebase-js-sdk/pull/3279) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - [fixed] Removed a delay that may have prevented Firestore from immediately
  reestablishing a network connection if a connectivity change occurred while
  the app was in the background.

## 1.16.0

### Minor Changes

- [`39ca8ecf`](https://github.com/firebase/firebase-js-sdk/commit/39ca8ecf940472159d0bc58212f34a70146da60c) [#3254](https://github.com/firebase/firebase-js-sdk/pull/3254) Thanks [@thebrianchen](https://github.com/thebrianchen)! - Added support for `set()` with merge options when using `FirestoreDataConverter`.

* [`877c060c`](https://github.com/firebase/firebase-js-sdk/commit/877c060c47bb29a8efbd2b96d35d3334fd9d9a98) [#3251](https://github.com/firebase/firebase-js-sdk/pull/3251) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - Re-adding the ReactNative bundle, which allows Firestore to be used without `btoa`/`atob` Polyfills.

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

* [`e90304c8`](https://github.com/firebase/firebase-js-sdk/commit/e90304c8ac4341d8b23b55da784eb21348b04025) [#3309](https://github.com/firebase/firebase-js-sdk/pull/3309) Thanks [@schmidt-sebastian](https://github.com/schmidt-sebastian)! - Removed internal wrapper around our public API that was meant to prevent incorrect SDK usage for JavaScript users, but caused our SDK to stop working in IE11.

* Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e), [`39ca8ecf`](https://github.com/firebase/firebase-js-sdk/commit/39ca8ecf940472159d0bc58212f34a70146da60c)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
  - @firebase/firestore-types@1.12.0
* [fixed] Fixed an issue that may have prevented the client from connecting
  to the backend immediately after a user signed in.

## 1.15.0

- [feature] Added an `experimentalForceOwningTab` setting that can be used to
  enable persistence in environments without LocalStorage, which allows
  persistence to be used in Web Workers (#983).
- [changed] All known failure cases for Indexed-related crashes have now been
  addressed. Instead of crashing the client, IndexedDB failures will result
  in rejected operations (e.g. rejected Writes or errored Query listeners).
  If these rejections surface in your app, you can retry these operations
  when IndexedDB access is restored.
  IndexedDB failures that occur due to background work are automatically
  retried.

  If you continue to see Indexed-related crashes, we appreciate feedback
  (https://github.com/firebase/firebase-js-sdk/issues/2755).

## 1.14.6

- [fixed] Fixed an issue that could cause Firestore to temporarily go
  offline when a Window visibility event occurred.
- [feature] Added support for calling `FirebaseFirestore.settings` with
  `{ ignoreUndefinedProperties: true }`. When set, Firestore ignores
  undefined properties inside objects rather than rejecting the API call.

## 1.14.4

- [fixed] Fixed a regression introduced in v7.14.2 that incorrectly applied
  a `FieldValue.increment` in combination with `set({...}, {merge: true})`.

## 1.14.3

- [fixed] Firestore now rejects `onSnapshot()` listeners if they cannot be
  registered in IndexedDB. Previously, these errors crashed the client.

## 1.14.2

- [fixed] Firestore now rejects write operations if they cannot be persisted
  in IndexedDB. Previously, these errors crashed the client.
- [fixed] Fixed a source of IndexedDB-related crashes for tabs that receive
  multi-tab notifications while the file system is locked.

## 1.10.2

- [fixed] Temporarily reverted the use of window.crypto to generate document
  IDs to address compatibility issues with IE 11, WebWorkers, and React Native.
- [changed] Firestore now limits the number of concurrent document lookups it
  will perform when resolving inconsistencies in the local cache (#2683).
- [changed] Changed the in-memory representation of Firestore documents to
  reduce memory allocations and improve performance. Calls to
  `DocumentSnapshot.getData()` and `DocumentSnapshot.toObject()` will see
  the biggest improvement.

## 1.10.1

- [fixed] Fixed an issue where the number value `-0.0` would lose its sign when
  stored in Firestore.

## 1.10.0

- [feature] Implemented `Timestamp.valueOf()` so that `Timestamp` objects can be
  compared for relative ordering using the JavaScript arithmetic comparison
  operators (#2632).
- [fixed] Fixed an issue where auth credentials were not respected in Cordova
  environments (#2626).
- [fixed] Fixed a performance regression introduced by the addition of
  `Query.limitToLast(n: number)` in Firestore 1.7.0 (Firebase 7.3.0) (#2620).
- [fixed] Fixed an issue where `CollectionReference.add()` would reject
  custom types when using `withConverter()` (#2606).

## 1.9.3

- [fixed] Fixed an issue where auth credentials were not respected in some
  Firefox or Chrome extensions. (#1491)
- [changed] Firestore previously required that every document read in a
  transaction must also be written. This requirement has been removed, and
  you can now read a document in transaction without writing to it.

## 1.9.2

- [fixed] Fixed an issue where auth credentials were not respected in certain
  browser environments (Electron 7, IE11 in trusted zone, UWP apps). (#1491)

## 1.9.0

- [feature] Added support for storing and retrieving custom types in Firestore.
  Added support for strongly typed collections, documents, and
  queries. You can now use `withConverter()` to supply a custom data
  converter that will convert between Firestore data and your custom type.

## 1.8.0

- [changed] Improved the performance of repeatedly executed queries when
  persistence is enabled. Recently executed queries should see dramatic
  improvements. This benefit is reduced if changes accumulate while the query
  is inactive. Queries that use the `limit()` API may not always benefit,
  depending on the accumulated changes.

## 1.7.0

- [changed] The client can now recover if certain periodic IndexedDB operations
  fail.
- [feature] Added `in` and `array-contains-any` query operators for use with
  `.where()`. `in` finds documents where a specified field’s value is IN a
  specified array. `array-contains-any` finds documents where a specified field
  is an array and contains ANY element of a specified array.
- [feature] Added `Query.limitToLast(n: number)` , which returns the last
  `n` documents as the result.

## 1.6.3

- [changed] Improved iOS 13 support by eliminating an additional crash in our
  IndexedDB persistence layer.

## 1.6.2

- [changed] Fixed a crash on iOS 13 that occurred when persistence was enabled
  in a background tab (#2232).
- [fixed] Fixed an issue in the interaction with the Firestore Emulator that
  caused requests with timestamps to fail.

## 1.6.0

- [feature] Added a `Firestore.onSnapshotsInSync()` method that notifies you
  when all your snapshot listeners are in sync with each other.
- [fixed] Fixed a regression that caused queries with nested field filters to
  crash the client if the field was not present in the local copy of the
  document.

## 1.5.0

- [feature] Added a `Firestore.waitForPendingWrites()` method that
  allows users to wait until all pending writes are acknowledged by the
  Firestore backend.
- [feature] Added a `Firestore.terminate()` method which terminates
  the instance, releasing any held resources. Once it completes, you can
  optionally call `Firestore.clearPersistence()` to wipe persisted Firestore
  data from disk.
- [changed] Improved performance for queries with filters that only return a
  small subset of the documents in a collection.
- [fixed] Fixed a race condition between authenticating and initializing
  Firestore that could result in initial writes to the database being dropped.

## 1.4.10

- [changed] Transactions now perform exponential backoff before retrying.
  This means transactions on highly contended documents are more likely to
  succeed.

## 1.4.6

- [changed] Transactions are now more flexible. Some sequences of operations
  that were previously incorrectly disallowed are now allowed. For example,
  after reading a document that doesn't exist, you can now set it multiple
  times successfully in a transaction.

## 1.4.5

- [fixed] Fixed an issue where query results were temporarily missing
  documents that previously had not matched but had been updated to now
  match the query (https://github.com/firebase/firebase-android-sdk/issues/155).

## 1.4.4

- [fixed] Fixed an internal assertion that was triggered when an update
  with a `FieldValue.serverTimestamp()` and an update with a
  `FieldValue.increment()` were pending for the same document.

## 1.4.0

- [changed] Added logging and a custom error message to help users hitting
  https://bugs.webkit.org/show_bug.cgi?id=197050 (a bug in iOS 12.2 causing
  the SDK to potentially crash when persistence is enabled).
- [fixed] Fixed an issue for environments missing `window.addEventListener`,
  such as in React Native with Expo (#1824).

## 1.3.5

- [feature] Added `clearPersistence()`, which clears the persistent storage
  including pending writes and cached documents. This is intended to help
  write reliable tests (#449).

## 1.3.3

- [changed] Firestore now recovers more quickly after network connectivity
  changes (airplane mode, Wi-Fi availability, etc.).

## 1.3.0

- [changed] Deprecated the `experimentalTabSynchronization` setting in favor of
  `synchronizeTabs`. If you use multi-tab synchronization, it is recommended
  that you update your call to `enablePersistence()`. Firestore logs an error
  if you continue to use `experimentalTabSynchronization`.
- [feature] You can now query across all collections in your database with a
  given collection ID using the `FirebaseFirestore.collectionGroup()` method.

## 1.1.4

- [feature] Added an `experimentalForceLongPolling` setting that can be
  used to work around proxies that prevent the Firestore client from connecting
  to the Firestore backend.

## 1.1.1

- [changed] Increased a connection timeout that could lead to large writes
  perpetually retrying without ever succeeding (#1447).
- [fixed] Fixed an issue with IndexedDb persistence that triggered an internal
  assert for Queries that use nested DocumentReferences in where() clauses
  (#1524, #1596).
- [fixed] Fixed an issue where transactions in a Node.JS app could be sent
  without auth credentials, leading to Permission Denied errors.

## 1.1.0

- [feature] Added `FieldValue.increment()`, which can be used in `update()`
  and `set(..., {merge:true})` to increment or decrement numeric field
  values safely without transactions.
- [changed] Prepared the persistence layer to support collection group queries.
  While this feature is not yet available, all schema changes are included
  in this release. Once you upgrade, you will not be able to use an older version
  of the Firestore SDK with persistence enabled.

## 1.0.5

- [changed] Improved performance when querying over documents that contain
  subcollections.

## 1.0.4

- [fixed] Fixed an uncaught promise error occurring when `enablePersistence()`
  was called in a second tab (#1531).

## 1.0.0

- [changed] The `timestampsInSnapshots` setting is now enabled by default.
  Timestamp fields that read from a `DocumentSnapshot` are now returned as
  `Timestamp` objects instead of `Date` objects. This is a breaking change;
  developers must update any code that expects to receive a `Date` object. See
  https://firebase.google.com/docs/reference/js/firebase.firestore.Settings#~timestampsInSnapshots
  for more details.
- [fixed] Fixed a crash that could happen when the app is shut down after
  a write has been sent to the server but before it has been received on
  a listener.

## 0.9.2

- [fixed] Fixed a regression introduced in 5.7.0 that caused apps using
  experimentalTabSynchronization to hit an exception for "Failed to obtain
  primary lease for action 'Collect garbage'".

## 0.9.1

- [changed] Added a custom error for schema downgrades.

## 0.9.0

- [changed] Removed eval()-based fallback for JSON parsing, allowing SDK to
  be used in environments that prohibit eval().
- [feature] Added a garbage collection process to on-disk persistence that
  removes older documents. This is enabled automatically if persistence is
  enabled, and the SDK will attempt to periodically clean up older, unused
  documents once the on-disk cache passes a threshold size (default: 40 MB).
  This threshold can be configured by changing the setting `cacheSizeBytes` in
  the settings passed to `Firestore.settings()`. It must be set to a minimum of
  1 MB. The garbage collection process can be disabled entirely by setting
  `cacheSizeBytes` to `CACHE_SIZE_UNLIMITED`.

## 0.8.3

- [fixed] Fixed an issue that prevented query synchronization between multiple
  tabs.

## 0.8.2

- [fixed] Fixed an issue where native ES6 module loading was not working.

## 0.8.1

- [fixed] Fixed an issue where typings are created in the wrong location.

## 0.8.0

- [feature] Access to offline persistence is no longer limited to a single tab.
  You can opt into this new experimental mode by invoking `enablePersistence()`
  with `{experimentalTabSynchronization: true}`. All tabs accessing persistence
  must use the same setting for this flag.
- [fixed] Fixed an issue where the first `get()` call made after being offline
  could incorrectly return cached data without attempting to reach the backend.
- [changed] Changed `get()` to only make one attempt to reach the backend before
  returning cached data, potentially reducing delays while offline.
- [fixed] Fixed an issue that caused Firebase to drop empty objects from calls
  to `set(..., { merge: true })`.
- [changed] Improved argument validation for several API methods.

## 0.7.3

- [changed] Changed the internal handling for locally updated documents that
  haven't yet been read back from Firestore. This can lead to slight behavior
  changes and may affect the `SnapshotMetadata.hasPendingWrites` metadata flag.
- [changed] Eliminated superfluous update events for locally cached documents
  that are known to lag behind the server version. Instead, we buffer these
  events until the client has caught up with the server.

## 0.7.2

- [fixed] Fixed a regression that prevented use of Firestore on ReactNative's
  Expo platform (#1138).

## 0.7.0

- [fixed] Fixed `get({source: 'cache'})` to be able to return nonexistent
  documents from cache.
- [changed] Prepared the persistence layer to allow shared access from multiple
  tabs. While this feature is not yet available, all schema changes are included
  in this release. Once you upgrade, you will not be able to use an older version
  of the Firestore SDK with persistence enabled.
- [fixed] Fixed an issue where changes to custom authentication claims did not
  take effect until you did a full sign-out and sign-in.
  (firebase/firebase-ios-sdk#1499)

## 0.6.1

- [changed] Improved how Firestore handles idle queries to reduce the cost of
  re-listening within 30 minutes.
- [changed] Improved offline performance with many outstanding writes.

## 0.6.0

- [fixed] Fixed an issue where queries returned fewer results than they should,
  caused by documents that were cached as deleted when they should not have
  been (firebase/firebase-ios-sdk#1548). Because some cache data is cleared,
  clients might use extra bandwidth the first time they launch with this
  version of the SDK.
- [feature] Added `firebase.firestore.FieldValue.arrayUnion()` and
  `firebase.firestore.FieldValue.arrayRemove()` to atomically add and remove
  elements from an array field in a document.
- [feature] Added `'array-contains'` query operator for use with `.where()` to
  find documents where an array field contains a specific element.

## 0.5.0

- [changed] Merged the `includeQueryMetadataChanges` and
  `includeDocumentMetadataChanges` options passed to `Query.onSnapshot()` into
  a single `includeMetadataChanges` option.
- [changed] `QuerySnapshot.docChanges()` is now a method that optionally takes
  an `includeMetadataChanges` option. By default, even when listening to a query
  with `{ includeMetadataChanges:true }`, metadata-only document changes are
  suppressed in `docChanges()`.
- [feature] Added new `{ mergeFields: (string|FieldPath)[] }` option to `set()`
  which allows merging of a reduced subset of fields.

## 0.4.1

- [fixed] Fixed a regression in Firebase JS release 4.13.0 regarding the
  loading of proto files, causing Node.JS support to break.

## 0.4.0

- [feature] Added a new `Timestamp` class to represent timestamp fields,
  currently supporting up to microsecond precision. It can be passed to API
  methods anywhere a JS Date object is currently accepted. To make
  `DocumentSnapshot`s read timestamp fields back as `Timestamp`s instead of
  Dates, you can set the newly added flag `timestampsInSnapshots` in
  `FirestoreSettings` to `true`. Note that the current behavior
  (`DocumentSnapshot`s returning JS Date objects) will be removed in a future
  release. `Timestamp` supports higher precision than JS Date.
- [feature] Added ability to control whether DocumentReference.get() and
  Query.get() should fetch from server only, (by passing { source: 'server' }),
  cache only (by passing { source: 'cache' }), or attempt server and fall back
  to the cache (which was the only option previously, and is now the default).

## 0.3.7

- [fixed] Fixed a regression in the Firebase JS release 4.11.0 that could
  cause get() requests made while offline to be delayed by up to 10
  seconds (rather than returning from cache immediately).

# 0.3.6

- [fixed] Fixed a regression in the Firebase JS release 4.11.0 that could
  cause a crash if a user signs out while the client is offline, resulting in
  an error of "Attempted to schedule multiple operations with timer id
  listen_stream_connection_backoff".

## 0.3.5

- [changed] If the SDK's attempt to connect to the Cloud Firestore backend
  neither succeeds nor fails within 10 seconds, the SDK will consider itself
  "offline", causing get() calls to resolve with cached results, rather than
  continuing to wait.
- [fixed] Fixed a potential race condition after calling `enableNetwork()` that
  could result in a "Mutation batchIDs must be acknowledged in order" assertion
  crash.

## 0.3.2

- [fixed] Fixed a regression in Firebase JS release 4.9.0 that could in certain
  cases result in an "OnlineState should not affect limbo documents." assertion
  crash when the client loses its network connection.

## 0.3.1

- [changed] Snapshot listeners (with the `includeMetadataChanges` option
  enabled) now receive an event with `snapshot.metadata.fromCache` set to
  `true` if the SDK loses its connection to the backend. A new event with
  `snapshot.metadata.fromCache` set to false will be raised once the
  connection is restored and the query is in sync with the backend again.
- [feature] Added `SnapshotOptions` API to control how DocumentSnapshots
  return unresolved server timestamps.
- [feature] Added `disableNetwork()` and `enableNetwork()` methods to
  `Firestore` class, allowing for explicit network management.
- [changed] For non-existing documents, `DocumentSnapshot.data()` now returns
  `undefined` instead of throwing an exception. A new
  `QueryDocumentSnapshot` class is introduced for Queries to reduce the number
  of undefined-checks in your code.
- [added] Added `isEqual` API to `GeoPoint`, `Blob`, `SnapshotMetadata`,
  `DocumentSnapshot`, `QuerySnapshot`, `CollectionReference`, `FieldValue`
  and `FieldPath`.
- [changed] A "Could not reach Firestore backend." message will be
  logged when the initial connection to the Firestore backend fails.
- [changed] A "Using maximum backoff delay to prevent overloading the
  backend." message will be logged when we get a resource-exhausted
  error from the backend.

## v0.2.1

- [feature] Added Node.js support for Cloud Firestore (with the exception of
  the offline persistence feature).
- [changed] Webchannel requests use \$httpHeaders URL parameter rather than
  normal HTTP headers to avoid an extra CORS preflight request when initiating
  streams / RPCs.

## v0.1.4

- [changed] Network streams are automatically closed after 60 seconds of
  idleness.
- [changed] We no longer log 'RPC failed' messages for expected failures.

## v0.1.2

- [changed] We now support `FieldValue.delete()` sentinels in `set()` calls
  with `{merge:true}`.
- [fixed] Fixed validation of nested arrays to allow indirect nesting

## v0.1.1

- [fixed] Fixed an issue causing exceptions when trying to use
  `firebase.firestore.FieldPath.documentId()` in an `orderBy()` or `where()`
  clause in a query.

## v0.1.0

- Initial public release.
