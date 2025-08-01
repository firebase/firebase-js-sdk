# @firebase/webchannel-wrapper

## 1.0.4

### Patch Changes

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

## 1.0.3

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

## 1.0.2

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

## 1.0.1

### Patch Changes

- [`b09a267ba`](https://github.com/firebase/firebase-js-sdk/commit/b09a267ba8c59d15865173844e73a92588342f61) [#8331](https://github.com/firebase/firebase-js-sdk/pull/8331) - fix: Fix a typo in the webchannel-wrapper's package.json that affected ems5 exports.

## 1.0.0

### Major Changes

- [`4b49630c7`](https://github.com/firebase/firebase-js-sdk/commit/4b49630c7f0e5880c5ae153f50ca2eff5eb32fbd) [#8190](https://github.com/firebase/firebase-js-sdk/pull/8190) - Use closure-net as a dependency of webchannel-wrapper and Firestore.

### Patch Changes

- [`14f9da66f`](https://github.com/firebase/firebase-js-sdk/commit/14f9da66fed45ac3f932ec590ca49c8a827d9fc5) [#8212](https://github.com/firebase/firebase-js-sdk/pull/8212) - fix: Update webchannel-wrapper to fix webchannel multi-byte character decoding bug in fetch streams.

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

## 0.10.6

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

## 0.10.5

### Patch Changes

- [`00235ba68`](https://github.com/firebase/firebase-js-sdk/commit/00235ba68fdbb5d9788a14ba2bdd75cad87301e4) [#7771](https://github.com/firebase/firebase-js-sdk/pull/7771) (fixes [#6118](https://github.com/firebase/firebase-js-sdk/issues/6118)) - Fix high memory usage of Firestore in browsers.

## 0.10.3

### Patch Changes

- [`60e4a07d2`](https://github.com/firebase/firebase-js-sdk/commit/60e4a07d2c89b5ea473f903a942aabab03050fa5) [#7593](https://github.com/firebase/firebase-js-sdk/pull/7593) - Fix an issue where Firestore was incorrectly using XHR instead of fetch for streaming response.

## 0.10.2

### Patch Changes

- [`78d2738c2`](https://github.com/firebase/firebase-js-sdk/commit/78d2738c246555556cba8dcfe2932639f80523ea) [#7569](https://github.com/firebase/firebase-js-sdk/pull/7569) - Fix how we enable fetch streams.

## 0.10.1

### Patch Changes

- [`23581c540`](https://github.com/firebase/firebase-js-sdk/commit/23581c54065f6b14a150ef579b71410842ac8518) [#7311](https://github.com/firebase/firebase-js-sdk/pull/7311) - Fix the new `experimentalLongPollingOptions.timeoutSeconds` setting, which was released in v9.22.0 but didn't work.

## 0.10.0

### Minor Changes

- [`98abcd5ed`](https://github.com/firebase/firebase-js-sdk/commit/98abcd5ed9bbc5910c1a94f0580f1ceffe95e564) [#7229](https://github.com/firebase/firebase-js-sdk/pull/7229) - Implemented an optimization in the local cache synchronization logic that reduces the number of billed document reads when documents were deleted on the server while the client was not actively listening to the query (e.g. while the client was offline).

### Patch Changes

- [`5e5c41225`](https://github.com/firebase/firebase-js-sdk/commit/5e5c41225869a5b3f315f2440d382ab010ba2e39) [#7228](https://github.com/firebase/firebase-js-sdk/pull/7228) - Make webchannel-wrapper exports Node-ESM-friendly.

## 0.9.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

## 0.8.1

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

## 0.8.0

### Minor Changes

- [`397317b53`](https://github.com/firebase/firebase-js-sdk/commit/397317b53c4d9d8aee761f566adf3616aef844ed) [#6643](https://github.com/firebase/firebase-js-sdk/pull/6643) - Set withCredentials=true when making requests via non-streaming RPCs, like is done for streaming RPCs.

## 0.7.0

### Minor Changes

- [`7c0c640a4`](https://github.com/firebase/firebase-js-sdk/commit/7c0c640a446c729ac66fec27dfd77d6398a468db) [#6107](https://github.com/firebase/firebase-js-sdk/pull/6107) - Enable encodeInitMessageHeaders. This transitions the Firestore client from encoding HTTP Headers via the Query Param to the request's POST payload.

  Requires Cloud Firestore Emulator v1.14.4 or newer.

## 0.6.2

### Patch Changes

- [`2cd1cc76f`](https://github.com/firebase/firebase-js-sdk/commit/2cd1cc76f2a308135cd60f424fe09084a34b5cb5) [#6307](https://github.com/firebase/firebase-js-sdk/pull/6307) (fixes [#6300](https://github.com/firebase/firebase-js-sdk/issues/6300)) - fix: add type declarations to exports field

## 0.6.1

### Patch Changes

- [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

## 0.6.0

### Minor Changes

- [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39) [#5539](https://github.com/firebase/firebase-js-sdk/pull/5539) - Use esm2017 builds by default

### Patch Changes

- [`456d664ae`](https://github.com/firebase/firebase-js-sdk/commit/456d664aef582fc18326ffbd418de0d7d3ef86b7) [#5485](https://github.com/firebase/firebase-js-sdk/pull/5485) - Remove an unused option (`backgroundChannelTest`).

## 0.5.1

### Patch Changes

- [`85f73abb5`](https://github.com/firebase/firebase-js-sdk/commit/85f73abb5c5dd5625c82b874adbfbb4acd1d70d7) [#5099](https://github.com/firebase/firebase-js-sdk/pull/5099) - Added a new export for FetchXmlHttpFactory.

## 0.5.0

### Minor Changes

- [`10fb5b87f`](https://github.com/firebase/firebase-js-sdk/commit/10fb5b87faecf3aa79e15545b21de99af3e51a71) [#4982](https://github.com/firebase/firebase-js-sdk/pull/4982) (fixes [#4977](https://github.com/firebase/firebase-js-sdk/issues/4977)) - Added a new export for FetchXmlHttpFactory.

## 0.4.1

### Patch Changes

- [`9822e125c`](https://github.com/firebase/firebase-js-sdk/commit/9822e125c399ae7271d4a9077f82b184a44526e4) [#4078](https://github.com/firebase/firebase-js-sdk/pull/4078) - Fix an issue that prevented `experimentalAutoDetectLongPolling` from working correctly.

## 0.4.0

### Minor Changes

- [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc) [#3724](https://github.com/firebase/firebase-js-sdk/pull/3724) - Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings. When
  enabled, the SDK's underlying transport (WebChannel) automatically detects if
  long-polling should be used. This is very similar to
  `experimentalForceLongPolling`, but only uses long-polling if required.

## 0.3.0

### Minor Changes

- [`7f0860a4`](https://github.com/firebase/firebase-js-sdk/commit/7f0860a4ced76da8492ae44d2267a2f1cc58eccb) [#3372](https://github.com/firebase/firebase-js-sdk/pull/3372) - Upgrade to the latest version of Google Closure Library and Compiler. This dependency will be
  necessary for future updates to the @firebase/firestore package. Developers will not need to
  make any changes to their code to handle this change.
