# @firebase/vertexai

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
