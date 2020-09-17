# RxFire Database

## Object Observables

### `object()`
The `object()` function creates an observable that emits object changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `object()`                               |
| **params**      | `database.Reference`                     |
| **import path** | `rxfire/database`                        |
| **return**      | `Observable<QueryChange>`                |

#### TypeScript Example
```ts
import { object } from 'rxfire/database';
import { database, initializeApp } from 'firebase';
import 'firebase/database';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.database();
const ref = db.ref('users/david');

// Seed the database
ref.set({ name: 'David' });

object(ref).subscribe(change => {
  const { event, snapshot, prevKey } = change;
  console.log(event, ' will always be value');
  console.log(prevKey, ' the previous key');
  console.log(snapshot.val(), ' this is the data');
});

// Retrieve the data and key
object(ref)
  .pipe(map(change => ({ _key: change.snapshot.key, ...change.snapshot.val() })))
  .subscribe(data => { console.log(data); });
```

## List Observables

### `list()`
The `list()` function creates an observable that emits a sorted array for each child event change. The optional `events` parameter will filter which child events populate the array.

|                 |                                                       |
|-----------------|-------------------------------------------------------|
| **function**    | `list()`                                              |
| **params**      | ref: `database.Reference` or `database.Query`, events?: `ListenEvent[]` |
| **import path** | `rxfire/database`                                     |
| **return**      | `Observable<QueryChange[]>`                           |

#### TypeScript Example
```ts
import { list, ListenEvent } from 'rxfire/database';
import { database } from 'firebase';
import 'firebase/database';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.database();
const ref = db.ref('users');

// Seed the database
ref.push({ name: 'David' });

list(ref).subscribe(changes => {
  changes.forEach(change => {
    const { snapshot, event, prevKey } = change;
    console.log(event, ' the event that populated the array');
    console.log(prevKey, ' the previous key');
    console.log(snapshot.val(), ' this is the data of the single change');    
  });
});

// Retrieve the data, key, and event
list(ref)
  .pipe(
    map(changes => changes.map(c => { 
      return { _key: c.snapshot.key, event: c.event, ...c.snapshot.val() }
    })
  )
  .subscribe(users => { console.log(users); })

// Listen only to 'child_added' events
list(ref, [ListenEvent.added] /* 'child_added' for js */)
  .subscribe(addedChanges => { console.log(addedChanges); });

// Listen only to 'child_added' and 'child_removed' events
list(ref, [ListenEvent.added, ListenEvent.removed] /* 'child_added', 'child_removed' for js */)
  .subscribe(addedChanges => { console.log(addedChanges); });
```

### `stateChanges()`
The `stateChanges()` function creates an observable that emits each time a change occurs at the reference or query passed. This is useful for tracking the changes in your list. The optional `events` parameter will filter which child events populate the array.

|                 |                                                      |
|-----------------|------------------------------------------------------|
| **function**    | `stateChanges()`                                     |
| **params**      | ref: `database.Reference` or `database.Query`, events?: `ListenEvent[]` |
| **import path** | `rxfire/database`                                    |
| **return**      | `Observable<QueryChange>`                          |

#### TypeScript Example
```ts
import { stateChanges, ListenEvent } from 'rxfire/database';
import { database } from 'firebase';
import 'firebase/database';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.database();
const ref = db.ref('users');

// Seed the database
ref.push({ name: 'David' });

stateChanges(ref).subscribe(change => {
  const { event, snapshot, prevKey } = change;
  console.log(event, ' the event type that just occurred');
  console.log(snapshot.val(), ' the value of the change');
});

// Retrieve the data, event, and key
stateChanges(ref).pipe(
  map(change => {
    return { 
      _key: change.snapshot.key, 
      event: change.event,
      ...change.snapshot.val(); 
    };
  })
).subscribe(data => { console.log(data); });

// Listen only to 'child_added' events
stateChanges(ref, [ListenEvent.added] /* 'child_added' for js */)
  .subscribe(addedChanges => { console.log(addedChanges); });

// Listen only to 'child_added' and 'child_removed' events
stateChanges(ref, [ListenEvent.added, ListenEvent.removed] /* 'child_added', 'child_removed' for js */)
  .subscribe(addedChanges => { console.log(addedChanges); });

```

### `auditTrail()`
The `auditTrail()` function creates an observable that emits the entire state trail. This is useful for debugging or replaying the state of a list in your app. The optional `events` parameter will filter which child events populate the array.

|                 |                                                      |
|-----------------|------------------------------------------------------|
| **function**    | `auditTrail()`                                       |
| **params**      | ref: `database.Reference` or `database.Query`, events?: `ListenEvent[]` |
| **import path** | `rxfire/database`                                    |
| **return**      | `Observable<QueryChange[]>`                          |

#### TypeScript Example
```ts
import { auditTrail, ListenEvent } from 'rxfire/database';
import { database } from 'firebase';
import 'firebase/database';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.database();
const ref = db.ref('users');

// Seed the database
const davidRef = ref.push();
davidRef.set({ name: 'David' });

auditTrail(ref).pipe(
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
    [{ _key: '3qtWqaKga8jA; name: 'David', event: 'child_added' }]
  
  second emission:
    [
      { _key: '3qtWqaKga8jA; name: 'David', event: 'child_added' },
      { _key: '3qtWqaKga8jA; name: 'David', event: 'child_removed' } 
    ]
  */
});

// When more events occur the trail still contains the previous events
// In this case we'll remove the only item
davidRef.remove();

// Now this will trigger the subscribe function above
```

## Event Observables

The `fromRef()` function creates an observable that emits reference changes.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `fromRef()`                              |
| **params**      | ref: `database.Reference` or `database.Query`, event: `ListenEvent` |
| **import path** | `rxfire/database`                        |
| **return**      | `Observable<QueryChange>`                |

#### TypeScript Example
```ts
import { fromRef, ListenEvent } from 'rxfire/database';
import { database, initializeApp } from 'firebase';
import 'firebase/database';
import { merge } from 'rxjs';
import { map } from 'rxjs/operators';

// Set up Firebase
const app = initializeApp({ /* config */ });
const db = app.database();
const ref = db.ref('users');

// Seed the database
ref.child('david').set({ name: 'David' });

// Subscribe to events
fromRef(ref, ListenEvent.value /* 'value' for js users */)
  .subscribe(change => {
    // Get value changes, this is basically what `object()` does
  });

// Merge multiple events (however this is really what `stateChanges()` does)
const addedChanges = fromRef(ref, ListenEvent.added);
const removedChanges = fromRef(ref, ListenEvent.removed);
merge(addedChanges, removedChanges)
  .subscribe(change => {
    const { event, snapshot, prevKey } = change;
    console.log(event); // This will be 'child_added' or 'child_removed' 
    // Note: Don't write this yourself. Use `stateChanges()` for this type of
    // functionality. This is just an example of using fromRef for custom 
    // behavior.
  });
```
