These tests are intended to be run against the minified compiled version of the
firebase binary (i.e. `firebase.js` and `firebase-firestore.js` of the `firebase` 
package).

The integration test files are modified to replace references to the
`firebase_export` entrypoint with the following `declare` statement:

```typescript
declare var firebase;
```

This will help the test files pass the compile step, and will allow us to, at
test time, inject the firebase variable into global scope (from the compiled)
files, which will be used by the tests.
