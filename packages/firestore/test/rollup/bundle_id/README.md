This test verifies that the @firebase/firestore bundle that node.js chooses
is the one that is expected.

# Usage

Run both of these commands:

```
node test.cjs
```

to test that the commonjs export from @firebase/firestore is used and

```
node test.mjs
```

to test that the ES modules export from @firebase/firestore is used.
