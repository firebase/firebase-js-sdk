---
"firebase": patch
"@firebase/database": patch
---

[fix] Instead of using production auth, the SDK will use test credentials
to connect to the Emulator when the RTDB SDK is used via the Firebase
Admin SDK.
