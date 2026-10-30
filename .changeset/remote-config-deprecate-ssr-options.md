---
'@firebase/remote-config': minor
'firebase': minor
---

Deprecated `RemoteConfigOptions.templateId` and `RemoteConfigOptions.initialFetchResponse`. Remote Config server-side rendering (SSR) hydration is no longer supported, and server templates (`"firebase-server"`) can't be fetched from client apps. These options will be removed in a future major release.
