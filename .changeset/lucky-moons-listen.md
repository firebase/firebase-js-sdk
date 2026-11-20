---
'@firebase/util': patch
---

Fixed `extractQuerystring()` treating `indexOf('?') === -1` as a match, which made it return the whole URL when there was no query string, and return an empty string when the input started with `?`.
