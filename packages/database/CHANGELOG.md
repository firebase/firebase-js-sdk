# Unreleased

## 0.6.7

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
- [changed] Added internal HTTP header to the WebSocket connection.
- [feature] Added ServerValue.increment() to support atomic field value increments
  without transactions.
- [fixed] Fixed Realtime Database URL parsing bug to support domains with more than 3 components.

# Released

- [fixed] Fixed an issue that caused large numeric values with leading zeros to
  not always be sorted correctly.
- [changed] Internal cleanup to Node.JS support.

# 6.4.0

- [fixed] Fixed an issue that caused `.info/serverTimeOffset` events not to fire (#2043).
- [changed] Treat `ns` url query parameter as the default Realtime Database
  namespace name.

# 6.3.4

- [fixed] Fixed an issue where multi-byte UTF-8 characters would not be written correctly when using `firebase.js` or `firebase-database.js` (#2035).

# 6.0.0

- [changed] Improved consistency between the type annotations for `Query.on`/`Reference.on`,
  `Query.off`/`Reference.off` and `Query.once`/`Reference.once` (#1188, #1204).
