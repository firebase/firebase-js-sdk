---
'@firebase/auth': patch
---

Wrap storage and persistence errors in `FirebaseError` (`auth/internal-error`) during current user updates, ensuring `error.code` is always defined and attaching the underlying exception under `error.customData.originalError`.
