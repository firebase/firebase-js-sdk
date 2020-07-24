# @firebase/util

## 0.3.0
### Minor Changes



- [`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c) [#3472](https://github.com/firebase/firebase-js-sdk/pull/3472)  - - Fix an error where an analytics PR included a change to `@firebase/util`, but
    the util package was not properly included in the changeset for a patch bump.
  
  - `@firebase/util` adds environment check methods `isIndexedDBAvailable`
    `validateIndexedDBOpenable`, and `areCookiesEnabled`.
