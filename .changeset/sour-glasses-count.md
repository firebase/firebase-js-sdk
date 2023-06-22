---
'@firebase/firestore': patch
'firebase': patch
---

Fix source maps that incorrectly referenced yet another minified and mangled bundle, rendering them useless. The fixed bundles' source maps are: index.esm2017.js, index.cjs.js, index.node.mjs, and index.browser.esm2017.js (lite sdk only).
