---
'@firebase/auth': patch
---

Fix `MultiFactorError` wrapping for federated provider links: an `MFA_REQUIRED` server response without `mfaPendingCredential` (which occurs when a federated link succeeds but the Identity Toolkit still returns MFA_REQUIRED) is no longer wrapped into an unresolvable `MultiFactorError`. The raw error is rethrown with its `_serverResponse` intact.
