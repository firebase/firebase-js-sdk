---
'firebase': major
'@firebase/firestore': major
---

This change contains multiple quality-of-life improvements when using the `FirestoreDataConverter` in `@firebase/firestore/lite` and `@firebase/firestore`:
- Support for passing in `FieldValue` property values when using a converter (via `WithFieldValue<T>` and `PartialWithFieldValue<T>`).
- Support for omitting properties in nested fields when performing a set operation with `{merge: true}` with a converter (via `PartialWithFieldValue<T>`).
- Support for typed update operations when using a converter (via the newly typed `UpdateData`). Improperly typed fields in
update operations on typed document references will no longer compile.
