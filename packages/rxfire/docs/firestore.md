# RxFire Firestore


### `doc()`
The `doc()` function creates an observable that emits document changes.  Returns snapshot of the data each time the document changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `doc()`                                  |
| **params**      | `ref:firestore.DocumentReference`        |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.DocumentSnapshot>` |

#### TypeScript Example
```ts
import { doc } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed the firestore
davidDoc.set({ name: 'David' });

doc(davidDoc).subscribe(snapshot => {
  console.log(snapshot.id);
  console.log(snapshot.data());
});
```

### `docData()`
The `docData()` function creates an observable that returns a stream of a document, mapped to its data field values and, optionally, the document ID.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `docData()`                              |
| **params**      | ref: `firestore.DocumentReference` <br> idField?: `string` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<T>` |

#### TypeScript Example
```ts
import { docData } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDocRef = db.doc('users/david');

// Seed the firestore
davidDocRef.set({ name: 'David' });

docData(davidDocRef,'uid').subscribe(userData => {
  console.log(`${userData.name} has id ${userData.uid}`);
});
```

## Collection Observables

### `collection()`
The `collection()` function creates an observable that emits changes to the specified collection based on the input query.  Any time updates are made, the function returns all documents in the collection that match the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collection()`                           |
| **params**      | query: `firestore.CollectionReference | firestore.Query` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.QueryDocumentSnapshot[]>`    |

#### TypeScript Example
```ts
import { collection } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed the firestore
davidDoc.set({ name: 'David' });

collection(db.collection('users'))
  .pipe(map(docs => docs.map(d => d.data())))
  .subscribe(users => { console.log(users) });
```

### `collectionData()`
The `collectionData()` function creates an observable that emits a stream of documents for the specified collection based on the input query.  When updates are made, returns all documents (field values and optional document ID) in the collection that match the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionData()`                           |
| **params**      | query: `firestore.CollectionReference | firestore.Query` <br> idField?: `string`  |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<T[]>`    |

#### TypeScript Example
```ts
import { collectionData } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed the firestore
davidDoc.set({ name: 'David' });

collectionData(db.collection('users'), 'uid')
  .subscribe(users => { console.log(users) });
```

### `collectionChanges()`
The `collectionChanges()` function creates an observable that emits the changes on the specified collection based on the input query. This is different than the collection function in that it does not contain the state of your application but only the individual changes. The optional `events` parameter filters which the type of change populate the array. By default, all changes are emitted. Returns the affected documents and the type of change that occurred (added, modified, or removed).

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionChanges()`                           |
| **params**      | query: `firestore.CollectionReference | firestore.Query` <br> events?: `firestore.DocumentChangeType[]` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.DocumentChange[]>`    |

#### TypeScript Example
```ts
import { collectionChanges } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed the firestore
davidDoc.set({ name: 'David' });

collectionChanges(db.collection('users'))
  .subscribe(changes => { console.log(users) });

// Listen to only 'added' events
collectionChanges(db.collection('users'), ['added'])
  .subscribe(addedEvents => { console.log(addedEvents) });
```

### `sortedChanges()`
The `sortedChanges()` function creates an observable that emits the reduced state of individual changes. This is different than the collection function in that it creates an array out of every individual change to occur. It also contains the `type` property to indicate what kind of change occured. The optional `events` parameter will filter which child events populate the array.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `sortedChanges()`                           |
| **params**      | query: `firestore.CollectionReference | firestore.Query`<br> events?: `firestore.DocumentChangeType[]` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.DocumentChange[]>`    |

#### TypeScript Example
```ts
import { sortedChanges } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed the firestore
davidDoc.set({ name: 'David' });

sortedChanges(db.collection('users'))
  .subscribe(changes => { console.log(users) });

// Listen to only 'added' events
docChanges(db.collection('users'), ['added'])
  .subscribe(addedEvents => { console.log(addedEvents) });
```

### `auditTrail()`
The `auditTrail()` function creates an observable that emits the entire state trail on the specified collection based on the input query. This is useful for debugging or replaying the changes to the database. The optional `events` parameter filters which the type of change populate the array. By default, all changes are emitted.

|                 |                                                      |
|-----------------|------------------------------------------------------|
| **function**    | `auditTrail()`                                       |
| **params**      | ref: `firestore.Reference | firestore.Query`<br> events?: `firestore.DocumentChangeType[]` |
| **import path** | `rxfire/firestore`                                    |
| **return**      | `Observable<firestore.DocumentChange[]>`              |

#### TypeScript Example
```ts
import { auditTrail } from 'rxfire/firestore';
import { firestore } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const collection = db.collection('users');

// Seed Firestore
const davidDoc = collection.doc('users/david');
davidDoc.set({ name: 'David' });

auditTrail(collection).pipe(
  map(change => {
    return { 
      _key: change.snapshot.key, 
      event: change.event,
      ...change.snapshot.val(); 
    };
  })
).subscribe(stateTrail => {
  console.log(stateTrail); 
  /**
  first emission:
    [{ _key: '3qtWqaKga8jA; name: 'David', event: 'added' }]
  
  second emission:
    [
      { _key: '3qtWqaKga8jA; name: 'David', event: 'added' },
      { _key: '3qtWqaKga8jA; name: 'David', event: 'removed' } 
    ]
  */
});

// When more events occur the trail still contains the previous events
// In this case we'll remove the only item
davidDoc.delete();

// Now this will trigger the subscribe function above
```

## Event Observables

### `fromDocRef()`
The `fromDocRef()` function creates an observable that emits document changes. This is an alias to the `doc()` function.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromDocRef()`                           |
| **params**      |  ref: `firestore.DocumentReference` <br> options?: `firestore.SnapshotListenOptions`              |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.DocumentSnapshot>` |

#### TypeScript Example
```ts
import { fromDocRef } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const davidDoc = db.doc('users/david');

// Seed Firestore
davidDoc.set({ name: 'David' });

fromDocRef(davidDoc).subscribe(snap => { console.log(snap); })
```

### `fromCollectionRef()`
The `fromCollectionRef()` function creates an observable that emits changes to the specified collection based on the input query and, optionally, the listen options. This is different than the `collection()` function in that it returns the full `QuerySnapshot` representing the results of the query.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromCollectionRef()`                    |
| **params**      | ref: `firestore.Reference | firestore.Query`<br> options?: `firestore.SnapshotListenOptions` |
| **import path** | `rxfire/firestore`                       |
| **return**      | `Observable<firestore.QuerySnapshot>`    |

#### TypeScript Example
```ts
import { fromCollectionRef } from 'rxfire/firestore';
import { firestore, initializeApp } from 'firebase';
import 'firebase/firestore';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.firestore();
const collection = db.collection('users');
const davidDoc = collection.doc('david');

// Seed Firestore
davidDoc.set({ name: 'David' });

fromCollectionRef(collection).subscribe(snap => { console.log(snap.docs); })
```
