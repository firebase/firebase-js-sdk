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

`FirebaseServerApp` can now be initalized with an App Check token instead of invoking the App Check
`getToken` method. This should unblock the use of App Check enforced products in SSR environments
where the App Check SDK cannot be initialized.
