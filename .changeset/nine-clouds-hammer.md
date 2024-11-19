---
'@firebase/installations': minor
'@firebase/app': minor
'@firebase/remote-config': patch
---

Add `installationsAuthToken` as an optional FirebaseServerApp variable. If present, then Installations `getId` and `getToken` will use the provided value instead of initializing the Installations SDK to retrieve those values dynamically. This should unlock SDKs that require these Installations values in a server environment where the Installations SDK isn't supported.
