---
'@firebase/installations': patch
'@firebase/remote-config': patch
---

Fixed `getToken()` failing with `installations/not-registered` (or a 401/404 "Generate Auth Token" error) when the server rejects a stored installation, e.g. on the first visit after the auth token expired. It now registers a new installation and resolves. Remote Config reads the installation ID after the token, so its fetch sends the ID the token was issued for.
