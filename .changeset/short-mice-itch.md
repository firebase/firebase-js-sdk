---
'@firebase/firestore': minor
'firebase': minor
---

Expanded `Firestore.WithFieldValue<T>` to include `T`. This allows developers to delegate `WithFieldValue<T>` inside wrappers of type `T` to avoid exposing Firebase types beyond Firebase-specific logic.
