---
'firebase': major
'@firebase/auth': major
---

Remove `firebase/auth/react-native` entry point. The React Native bundle should be automatically picked up by React Native build tools which recognize the `react-native` fields in `package.json` (at the top level and in `exports`).
