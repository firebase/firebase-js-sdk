---
'firebase': minor
'@firebase/firestore': minor
---

Added support for window functions in Pipelines, with the `addWindowFields` stage for computing aggregates such as running totals and moving averages over partitioned and sorted frames of documents, and `over()` for framing individual aggregates.
