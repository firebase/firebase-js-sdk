## Unreleased

## 0.1.1

### Patch Changes

- [`cf988b0b1`](https://github.com/firebase/firebase-js-sdk/commit/cf988b0b1217a06e5d1b9130d6048178626dac48) [#8570](https://github.com/firebase/firebase-js-sdk/pull/8570) - - Throw error when calling `executeQuery` with mutations

- [`813b9fad6`](https://github.com/firebase/firebase-js-sdk/commit/813b9fad63ff7b8798e4f4e17ccd528a784698d9) [#8565](https://github.com/firebase/firebase-js-sdk/pull/8565) - - Modified user agent to use language instead of platform

- Updated dependencies [[`479226bf3`](https://github.com/firebase/firebase-js-sdk/commit/479226bf3ebd99017bb12fa21440c75715658702)]:
  - @firebase/component@0.6.10
  - @firebase/logger@0.4.3
  - @firebase/util@1.10.1

## 0.1.0

### Minor Changes

- [`beaa4dffb`](https://github.com/firebase/firebase-js-sdk/commit/beaa4dffb7f48cb12ccc6c1d1b7cdc9c3605fc04) [#8480](https://github.com/firebase/firebase-js-sdk/pull/8480) - Included Data Connect product.

* Added app check support # @firebase/data-connect

## 0.0.3

- Updated reporting to use @firebase/data-connect instead of @firebase/connect.
- Added functionality to retry queries and mutations if the server responds with UNAUTHENTICATED.
- Moved `validateArgs` to core SDK.
- Updated errors to only show relevant details to the user.
- Added ability to track whether user is calling core sdk or generated sdk.
