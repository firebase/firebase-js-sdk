# @firebase/ai

## 2.2.1

### Patch Changes

- [`095c098`](https://github.com/firebase/firebase-js-sdk/commit/095c098de1e4399f3fb2993edae45060b2a8c6d0) [#9232](https://github.com/firebase/firebase-js-sdk/pull/9232) (fixes [#9231](https://github.com/firebase/firebase-js-sdk/issues/9231)) - Remove accidental `factory` export.

## 2.2.0

### Minor Changes

- [`984086b`](https://github.com/firebase/firebase-js-sdk/commit/984086b0b1bd607d3aac4cbb8400bc61416e2959) [#9224](https://github.com/firebase/firebase-js-sdk/pull/9224) - Add support for the Gemini Live API.

- [`9b63cd6`](https://github.com/firebase/firebase-js-sdk/commit/9b63cd60efcd02b64b0d37f81affb3eabf70f9eb) [#9192](https://github.com/firebase/firebase-js-sdk/pull/9192) - Add `thoughtSummary()` convenience method to `EnhancedGenerateContentResponse`.

- [`02280d7`](https://github.com/firebase/firebase-js-sdk/commit/02280d747863445fa1c21dfda01030412a6cecff) [#9201](https://github.com/firebase/firebase-js-sdk/pull/9201) - Add App Check limited use token option to `getAI()`.

### Patch Changes

- [`84b8bed`](https://github.com/firebase/firebase-js-sdk/commit/84b8bed35b69e4713fe8f677803cb06625525a61) [#9222](https://github.com/firebase/firebase-js-sdk/pull/9222) - Fixed an issue where `AIError` messages were too long after including an entire response body.

- [`c5f08a9`](https://github.com/firebase/firebase-js-sdk/commit/c5f08a9bc5da0d2b0207802c972d53724ccef055) [#9216](https://github.com/firebase/firebase-js-sdk/pull/9216) - Add 'includeSafetyAttributes' field to Predict request payloads.

- [`cbef6c6`](https://github.com/firebase/firebase-js-sdk/commit/cbef6c6e5b752c316104f9c834e0fe21b75c3ef1) [#9225](https://github.com/firebase/firebase-js-sdk/pull/9225) - Exclude ChromeAdapterImpl code from Node entry point.

## 2.1.0

### Minor Changes

- [`e25317f`](https://github.com/firebase/firebase-js-sdk/commit/e25317f9f3c58305bc093e4f2e676690feb16db0) [#9029](https://github.com/firebase/firebase-js-sdk/pull/9029) - Add hybrid inference options to the Firebase AI SDK.

## 2.0.0

### Major Changes

- [`5200f7b`](https://github.com/firebase/firebase-js-sdk/commit/5200f7bb777cf2260dcd396fbd19ac6cc7cb44c4) [#9042](https://github.com/firebase/firebase-js-sdk/pull/9042) - Add support for `anyOf` schemas

- [`e59cd7d`](https://github.com/firebase/firebase-js-sdk/commit/e59cd7da1f375ec89f237ceb684c9f450d65cd34) [#9137](https://github.com/firebase/firebase-js-sdk/pull/9137) - Convert TS enums exports in Firebase AI into const variables.

- [`cb19688`](https://github.com/firebase/firebase-js-sdk/commit/cb19688bf3d339a46c4964cb30b6263af08526e6) [#9079](https://github.com/firebase/firebase-js-sdk/pull/9079) - Remove GroundingAttribution

- [`ec5f374`](https://github.com/firebase/firebase-js-sdk/commit/ec5f37403d9ebe28d3d71a7789d59edfb12762df) [#9063](https://github.com/firebase/firebase-js-sdk/pull/9063) - Remove `VertexAI` APIs.

### Minor Changes

- [`a4ccd25`](https://github.com/firebase/firebase-js-sdk/commit/a4ccd254dd1ecb63aa010ca010ad50d4b8a8316a) [#9068](https://github.com/firebase/firebase-js-sdk/pull/9068) - Add support for Grounding with Google Search.

- [`6ab4e13`](https://github.com/firebase/firebase-js-sdk/commit/6ab4e13a1665dab4be89ecc141b4584a5a6df569) [#9156](https://github.com/firebase/firebase-js-sdk/pull/9156) - Add support for Thinking Budget.

- [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113) [#9128](https://github.com/firebase/firebase-js-sdk/pull/9128) - Update node "engines" version to a minimum of Node 20.

### Patch Changes

- [`ae976d0`](https://github.com/firebase/firebase-js-sdk/commit/ae976d02908a5a8913c5fcd4c0485fcf4b081fec) [#8948](https://github.com/firebase/firebase-js-sdk/pull/8948) (fixes [#8944](https://github.com/firebase/firebase-js-sdk/issues/8944)) - Fix typings for `functionDeclaration.parameters`.

- [`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9) [#9167](https://github.com/firebase/firebase-js-sdk/pull/9167) - Set build targets to ES2020.

- Updated dependencies [[`f18b25f`](https://github.com/firebase/firebase-js-sdk/commit/f18b25f73a05a696b6a9ed45702a84cc9dd5c6d9), [`25b60fd`](https://github.com/firebase/firebase-js-sdk/commit/25b60fdaabe910e1538684a3c490b0900fb5f113)]:
  - @firebase/component@0.7.0
  - @firebase/logger@0.5.0
  - @firebase/util@1.13.0

## 1.4.1

### Patch Changes

- [`b97eab3`](https://github.com/firebase/firebase-js-sdk/commit/b97eab36a3553c906c35f4751a0b17c717178b13) [#9090](https://github.com/firebase/firebase-js-sdk/pull/9090) - Add deprecation label to `totalBillableCharacters`. `totalTokens` should be used instead.

- Updated dependencies [[`42ac401`](https://github.com/firebase/firebase-js-sdk/commit/42ac4011787db6bb7a08f8c84f364ea86ea51e83)]:
  - @firebase/util@1.12.1
  - @firebase/component@0.6.18

## 1.4.0

### Minor Changes

- [`1933324`](https://github.com/firebase/firebase-js-sdk/commit/1933324e0f3e4c8ed4d4d784f0c701fd0ec6ebc3) [#9026](https://github.com/firebase/firebase-js-sdk/pull/9026) - Add support for `minItems` and `maxItems` to `Schema`.

- [`40be2db`](https://github.com/firebase/firebase-js-sdk/commit/40be2dbb884b8e1485862af8bb015e23db69ccbf) [#9047](https://github.com/firebase/firebase-js-sdk/pull/9047) - Add `title`, `maximum`, `minimum`, `propertyOrdering` to Schema builder

## 1.3.0

### Minor Changes

- [`e99683b`](https://github.com/firebase/firebase-js-sdk/commit/e99683b17cf75c581bd362a1d7cb85f0b9c110ba) [#8922](https://github.com/firebase/firebase-js-sdk/pull/8922) - Add support for Gemini multimodal output

- [`d5082f9`](https://github.com/firebase/firebase-js-sdk/commit/d5082f9f2fc4de98a6bfd1c6a5af4571af4d0bc6) [#8931](https://github.com/firebase/firebase-js-sdk/pull/8931) - Add support for the Gemini Developer API, enabling usage in a free tier, and add new `AI` API to accomodate new product naming.

### Patch Changes

- [`050c1b6`](https://github.com/firebase/firebase-js-sdk/commit/050c1b6a099b87be1488b9207e4fad4da9f8f64b) [#8972](https://github.com/firebase/firebase-js-sdk/pull/8972) - Pass `GenerativeModel`'s `BaseParams` to created chat sessions. This fixes an issue where `GenerationConfig` would not be inherited from `ChatSession`.

- Updated dependencies [[`8a03143`](https://github.com/firebase/firebase-js-sdk/commit/8a03143b9217effdd86d68bdf195493c0979aa27)]:
  - @firebase/util@1.12.0
  - @firebase/component@0.6.17

## 1.2.4

### Patch Changes

- Updated dependencies [[`9bcd1ea`](https://github.com/firebase/firebase-js-sdk/commit/9bcd1ea9b8cc5b55692765d40df000da8ddef02b)]:
  - @firebase/util@1.11.3
  - @firebase/component@0.6.16

## 1.2.3

### Patch Changes

- Updated dependencies [[`8593fa0`](https://github.com/firebase/firebase-js-sdk/commit/8593fa05bd884c2f1f6f3b4ae062efa48af93d24)]:
  - @firebase/util@1.11.2
  - @firebase/component@0.6.15

## 1.2.2

### Patch Changes

- Updated dependencies [[`ea1f913`](https://github.com/firebase/firebase-js-sdk/commit/ea1f9139e6baec0269fbb91233fd3f7f4b0d5875), [`0e12766`](https://github.com/firebase/firebase-js-sdk/commit/0e127664946ba324c6566a02b393dafd23fc1ddb)]:
  - @firebase/util@1.11.1
  - @firebase/component@0.6.14

## 1.2.1

### Patch Changes

- [`648de84`](https://github.com/firebase/firebase-js-sdk/commit/648de84b05c827d33d6b22aceb6eff01208ebdf0) [#8809](https://github.com/firebase/firebase-js-sdk/pull/8809) - Throw an error when initializing models if `appId` is not defined in the given `VertexAI` instance.

- [`faaeb48`](https://github.com/firebase/firebase-js-sdk/commit/faaeb48e0c9dfddd014e5fb52088d39c895e9874) [#8832](https://github.com/firebase/firebase-js-sdk/pull/8832) - Label `GroundingAttribution` as deprecated.

## 1.2.0

### Minor Changes

- [`25985ac`](https://github.com/firebase/firebase-js-sdk/commit/25985ac3c3a797160e2dc3a2a28aba9f63fe6dfd) [#8827](https://github.com/firebase/firebase-js-sdk/pull/8827) - Add `systemInstruction`, `tools`, and `generationConfig` to `CountTokensRequest`.

- [`058afa2`](https://github.com/firebase/firebase-js-sdk/commit/058afa280c8e9a72e27f3b1fbdb2921012dc65d3) [#8741](https://github.com/firebase/firebase-js-sdk/pull/8741) - Added missing `BlockReason` and `FinishReason` enum values.

## 1.1.0

### Minor Changes

- [`9d82665`](https://github.com/firebase/firebase-js-sdk/commit/9d826659334e1a43acd1126fab6e09a305e04936) [#8757](https://github.com/firebase/firebase-js-sdk/pull/8757) - Added support for modality-based token count.

- [`ce2c775`](https://github.com/firebase/firebase-js-sdk/commit/ce2c77511210df109fdf381c7c02175173a6f7a2) [#8683](https://github.com/firebase/firebase-js-sdk/pull/8683) - **Public Preview** Added support for generating images using the Imagen 3 model.

### Patch Changes

- [`554c7bd`](https://github.com/firebase/firebase-js-sdk/commit/554c7bdc12cfde834ce5c4fa729a6cb790e1e5c2) [#8736](https://github.com/firebase/firebase-js-sdk/pull/8736) (fixes [#8714](https://github.com/firebase/firebase-js-sdk/issues/8714)) - Filter out empty text parts from streaming responses.

- [`884cbd7`](https://github.com/firebase/firebase-js-sdk/commit/884cbd7d89d4dd9162858f108c39e75896c2db5a) [#8728](https://github.com/firebase/firebase-js-sdk/pull/8728) - Create Node CJS and ESM bundles.

- Updated dependencies [[`777f465`](https://github.com/firebase/firebase-js-sdk/commit/777f465ff37495ff933a29583769ce8a6a2b59b5)]:
  - @firebase/util@1.11.0
  - @firebase/component@0.6.13

## 1.0.4

### Patch Changes

- [`97d48c7`](https://github.com/firebase/firebase-js-sdk/commit/97d48c7650e2d4273b7f94c8964dfcb44113952a) [#8651](https://github.com/firebase/firebase-js-sdk/pull/8651) - `FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
  `getToken` method. This should unblock the use of App Check enforced products in SSR environments
  where the App Check SDK cannot be initialized.

## 1.0.3

### Patch Changes

- Updated dependencies [[`25a6204c1`](https://github.com/firebase/firebase-js-sdk/commit/25a6204c1531b6c772e5368d12b2411ae1d21bbc)]:
  - @firebase/util@1.10.3
  - @firebase/component@0.6.12

## 1.0.2

### Patch Changes

- [`c540ba9ee`](https://github.com/firebase/firebase-js-sdk/commit/c540ba9eedd189ec8ac0932124d2cc400d1bd1d6) [#8663](https://github.com/firebase/firebase-js-sdk/pull/8663) - Clear fetch timeout after request completion. Fixes an issue that caused Node scripts to hang due to a pending timeout.

## 1.0.1

### Patch Changes

- [`052e438bc`](https://github.com/firebase/firebase-js-sdk/commit/052e438bc9abc5bfaf553a41edd2cde44dc70bc2) [#8589](https://github.com/firebase/firebase-js-sdk/pull/8589) - Update to new base URL in documentation

- [`1f1ba3fee`](https://github.com/firebase/firebase-js-sdk/commit/1f1ba3feedf543a8ce42326dda077b0cdae21f2f) [#8587](https://github.com/firebase/firebase-js-sdk/pull/8587) - Remove indentation in VertexAI API Not Enabled error

- [`4db3d3e7b`](https://github.com/firebase/firebase-js-sdk/commit/4db3d3e7be8b435b523d23b0910958a495c09ad8) [#8591](https://github.com/firebase/firebase-js-sdk/pull/8591) - Send App Check dummy token in header if there is an App Check getToken error.

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

- Updated dependencies [[`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1)]:
  - @firebase/app-check-interop-types@0.3.3
  - @firebase/component@0.6.11
  - @firebase/logger@0.4.4
  - @firebase/util@1.10.2

## 1.0.0

### Major Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Release VertexAI in Firebase for general availability.

### Patch Changes

- [`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702) [#8475](https://github.com/firebase/firebase-js-sdk/pull/8475) - Remove ES5 bundles. The minimum required ES version is now ES2017.

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 0.0.4

### Patch Changes

- Updated dependencies [[`16d62d4fa`](https://github.com/firebase/firebase-js-sdk/commit/16d62d4fa16faddb8cb676c0af3f29b8a5824741)]:
  - @firebase/util@1.10.0
  - @firebase/component@0.6.9

## 0.0.3

### Patch Changes

- [`e7260e23d`](https://github.com/firebase/firebase-js-sdk/commit/e7260e23d186787d44c145829af245534db4d054) [#8240](https://github.com/firebase/firebase-js-sdk/pull/8240) - Add a publicly exported `VertexAIError` class.

- Updated dependencies [[`192561b15`](https://github.com/firebase/firebase-js-sdk/commit/192561b1552a08840d8e341f30f3dbe275465558)]:
  - @firebase/util@1.9.7
  - @firebase/component@0.6.8

## 0.0.2

### Patch Changes

- [`3883133c3`](https://github.com/firebase/firebase-js-sdk/commit/3883133c33ba48027081eef9d946988f33b07606) [#8256](https://github.com/firebase/firebase-js-sdk/pull/8256) - Change `types` paths to point to rolled-up public `d.ts` files. This fixes some TypeScript compiler errors users are seeing.

## 0.0.1

### Patch Changes

- [`506b8a6ab`](https://github.com/firebase/firebase-js-sdk/commit/506b8a6abf662d74c2085fb729cace57d861ed17) [#8119](https://github.com/firebase/firebase-js-sdk/pull/8119) - Add the preview version of the VertexAI SDK.

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

- Updated dependencies [[`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7)]:
  - @firebase/app-check-interop-types@0.3.2
  - @firebase/component@0.6.7
  - @firebase/logger@0.4.2
  - @firebase/util@1.9.6
