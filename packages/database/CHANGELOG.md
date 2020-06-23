# Unreleased
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
