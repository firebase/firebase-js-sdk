# Notes

## API
* getDoc uses FirestoreClient - maybe that's where we can inject the id token
* getDocFromCache uses FirestoreClient
* getDocFromServer uses FirestoreClient
* getDocs uses FirestoreClient
* getDocsFromCache uses FirestoreClient
* getDocsFromServer uses FirestoreClient
* `setDoc` -> `executeWrite` -> `firestoreClientWrite`
* `updateDoc` -> `executeWrite` -> `firestoreClientWrite`
* `deleteDoc` -> `executeWrite` -> `firestoreClientWrite`
* `addDoc` -> `executeWrite` -> `firestoreClientWrite`
* `onSnapshot` -> `firestoreClientListen`
* `onSnapshotResume` -> `onSnapshotQuerySnapshotBundle` -> `loadBundle` -> `onSnapshot`
* `onSnapshotsInSync` -> `firestoreClientAddSnapshotsInSyncListener`
* `onSnapshotDocumentSnapshotBundle` -> `loadBundle` -> `onSnapshot`
* `onSnapshotQuerySnapshotBundle` -> `loadBundle` -> `onSnapshot`

## Checklist

[] Make sure that the id token doesn't get added to custom data when not needed
[] Check if onWatchChange is the right place.