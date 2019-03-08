# RxFire Firestore

## Document Observables

### `doc()`
The `doc()` function creates an observable that emits document changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `doc()`                                  |
| **params**      | `firestore.DocumentReference`            |
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

## Collection Observables

### `collection()`
The `collection()` function creates an observable that emits collection changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collection()`                           |
| **params**      | `firestore.CollectionReference` | `firestore.Query` |
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

### `collectionChanges()`
The `collectionChanges()` function creates an observable that emits the event changes on a collection. This is different than the collection function in that it does not contain the state of your application but only the individual changes. The optional `events` parameter will filter which child events populate the array.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `collectionChanges()`                           |
| **params**      | query: `firestore.CollectionReference` | `firestore.Query`, events?: `firestore.DocumentChangeType[]` |
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
| **params**      | query: `firestore.CollectionReference` | `firestore.Query`, events?: `firestore.DocumentChangeType[]` |
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
The `auditTrail()` function creates an observable that emits the entire state trail. This is useful for debugging or replaying the state of a list in your app. The optional `events` parameter will filter which child events populate the array.

|                 |                                                      |
|-----------------|------------------------------------------------------|
| **function**    | `auditTrail()`                                       |
| **params**      | ref: `firestore.Reference` or `firestore.Query`, events?: `firestore.DocumentChangeType[]` |
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
| **params**      | ref: `firestore.Reference`               |
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
The `fromCollectionRef()` function creates an observable that emits document changes. This is different than the `collection()` function in that it returns the full `QuerySnapshot` instead of plucking off the `QueryDocumentSnapshot[]` array.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromCollectionRef()`                    |
| **params**      | ref: `firestore.CollectionReference` or `firestore.Query` |
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
