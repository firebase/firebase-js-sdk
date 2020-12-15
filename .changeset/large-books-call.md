---
"@firebase/auth": patch
---

Update auth token logic to rely on device clock time instead of server time. This fixes an issue seen when a device's clock is skewed by a lot: https://github.com/firebase/firebase-js-sdk/issues/3222
