---
'@firebase/auth': major
'firebase': major
---

Change `getAuth()` in the React Native bundle to default to importing `AsyncStorage` from `@react-native-async-storage/async-storage` instead of from the `react-native` core package (which has recently removed it).
