---
"@firebase/firestore": patch
---

The Node SDK now uses JSON to load its internal Protobuf definition, which allows the Node SDK to work with bundlers such as Rollup and Webpack.
