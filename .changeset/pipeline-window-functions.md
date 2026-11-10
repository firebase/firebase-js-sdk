---
'firebase': minor
'@firebase/firestore': minor
---

Added support for window functions in Pipelines, with the `addWindowFields` stage for computing aggregates such as running totals and moving averages over partitioned and sorted frames of documents, and `over()` for framing individual aggregates. Window functions are in preview until the backend launch is announced in the [Firestore release notes](https://docs.cloud.google.com/firestore/docs/release-notes).
