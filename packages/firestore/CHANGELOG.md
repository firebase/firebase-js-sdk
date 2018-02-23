# Unreleased
- [fixed] Fixed a regression in Firebase JS release 4.9.0 that could in certain
  cases result in an "OnlineState should not affect limbo documents." assertion
  crash when the client loses its network connection.

# 0.3.1
- [changed] Snapshot listeners (with the `includeMetadataChanges` option
  enabled) now receive an event with `snapshot.metadata.fromCache` set to
  `true` if the SDK loses its connection to the backend. A new event with
  `snapshot.metadata.fromCache` set to false will be raised once the
  connection is restored and the query is in sync with the backend again.
- [feature] Added `SnapshotOptions` API to control how DocumentSnapshots
  return unresolved server timestamps.
- [feature] Added `disableNetwork()` and `enableNetwork()` methods to
  `Firestore` class, allowing for explicit network management.
- [changed] For non-existing documents, `DocumentSnapshot.data()` now returns
  `undefined` instead of throwing an exception. A new
  `QueryDocumentSnapshot` class is introduced for Queries to reduce the number
  of undefined-checks in your code.
- [added] Added `isEqual` API to `GeoPoint`, `Blob`, `SnapshotMetadata`,
  `DocumentSnapshot`, `QuerySnapshot`, `CollectionReference`, `FieldValue`
  and `FieldPath`.
- [changed] A "Could not reach Firestore backend." message will be
  logged when the initial connection to the Firestore backend fails.
- [changed] A "Using maximum backoff delay to prevent overloading the
  backend." message will be logged when we get a resource-exhausted
  error from the backend.

# v0.2.1
- [feature] Added Node.js support for Cloud Firestore (with the exception of
  the offline persistence feature).
- [changed] Webchannel requests use $httpHeaders URL parameter rather than
  normal HTTP headers to avoid an extra CORS preflight request when initiating
  streams / RPCs.

# v0.1.4
- [changed] Network streams are automatically closed after 60 seconds of
  idleness.
- [changed] We no longer log 'RPC failed' messages for expected failures.

# v0.1.2
- [changed] We now support `FieldValue.delete()` sentinels in `set()` calls
  with `{merge:true}`.
- [fixed] Fixed validation of nested arrays to allow indirect nesting

# v0.1.1
- [fixed] Fixed an issue causing exceptions when trying to use
  `firebase.firestore.FieldPath.documentId()` in an `orderBy()` or `where()`
  clause in a query.

# v0.1.0
- Initial public release.
