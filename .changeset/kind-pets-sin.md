---
'@firebase/app': minor
'firebase': minor
'@firebase/data-connect': patch
'@firebase/firestore': patch
'@firebase/functions': patch
'@firebase/database': patch
'@firebase/vertexai': patch
'@firebase/storage': patch
'@firebase/auth': patch
---

FirebaseServerApp may now be initalized with an App Check which will be used by SDKs in lieu of initializing an instance of App Check to get the current token. This should unblock the use of App Check enforced products in SSR environments.
