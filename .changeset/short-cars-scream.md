---
'@firebase/analytics': patch
'@firebase/util': minor
'firebase': patch
---

- Fix an error where an analytics PR included a change to `@firebase/util`, but
  the util package was not properly included in the changeset for a patch bump.

- `@firebase/util` adds environment check methods `isIndexedDBAvailable`
  `validateIndexedDBOpenable`, and `areCookiesEnabled`.