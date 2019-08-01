# Unreleased
- [fixed] Fixed an uglify issue in minified scripts (`firebase.js` and `firebase-database.js`) where multi-byte UTF-8 characters were encoded incorrectly. 
- [changed] Improved consistency between the type annotations for `Query.on`/`Reference.on`, 
  `Query.off`/`Reference.off` and `Query.once`/`Reference.once` (#1188, #1204).