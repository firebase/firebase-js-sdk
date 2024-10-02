## Unreleased

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
