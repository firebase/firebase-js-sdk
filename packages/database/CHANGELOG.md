# Unreleased
- [fixed] Fixed an issue where multi-byte UTF-8 characters would not be written correctly when using `firebase.js` or `firebase-database.js` (#2035).
- [changed] Improved consistency between the type annotations for `Query.on`/`Reference.on`, 
  `Query.off`/`Reference.off` and `Query.once`/`Reference.once` (#1188, #1204).