---
'@firebase/auth': patch
'firebase': patch
---

Fixed an unhandled `auth/network-request-failed` rejection when another tab updates the signed-in user while the device is offline and the token has expired.
