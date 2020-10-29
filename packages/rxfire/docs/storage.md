# RxFire Storage

## Task Observables

### `fromTask()`
The `fromTask()` function creates an observable that emits progress changes.

|                 |                                            |
|-----------------|--------------------------------------------|
| **function**    | `fromTask()`                               |
| **params**      | `storage.UploadTask`                       |
| **import path** | `rxfire/storage`                           |
| **return**      | `Observable<firestore.UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { fromTask } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();
const davidRef = storage.ref('users/david.png');

// Upload a transparent 1x1 pixel image
const task = davidRef.putString('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

fromTask(task)
  .subscribe(snap => { console.log(snap.bytesTransferred); });
```

### `percentage()`
The `percentage()` function creates an observable that emits percentage of the uploaded bytes.

|                 |                                            |
|-----------------|--------------------------------------------|
| **function**    | `percentage()`                             |
| **params**      | `storage.UploadTask`                       |
| **import path** | `rxfire/storage`                           |
| **return**      | `Observable<number>`                       |

#### TypeScript Example
```ts
import { percentage } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();
const davidRef = storage.ref('users/david.png');

// Upload a transparent 1x1 pixel image
const task = davidRef.putString('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

percentage(task)
  .subscribe(action => { console.log(action.progress, action.snapshot); });
```

## Reference Observables

### `getDownloadURL()`
The `getDownloadURL()` function creates an observable that emits the URL of the file.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `getDownloadURL()`                       |
| **params**      | `storage.Reference`                      |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<string>`                     |

#### TypeScript Example
```ts
import { getDownloadURL } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();

// Assume this exists
const davidRef = storage.ref('users/david.png');

getDownloadURL(davidRef)
  .subscribe(url => { console.log(url) });
```

### `getMetadata()`
The `getMetadata()` function creates an observable that emits the URL of the file's metadta.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `getMetadata()`                          |
| **params**      | `storage.Reference`                      |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<Object>`                     |

#### TypeScript Example
```ts
import { getMetadata } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();

// Assume this exists
const davidRef = storage.ref('users/david.png');

getMetadata(davidRef)
  .subscribe(meta => { console.log(meta) });
```

### `put()`
The `put()` function creates an observable that emits the upload progress of a file.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `put()`                                  |
| **params**      | ref: `storage.Reference`, data: `any`, metadata?: `storage.UploadMetadata`                |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<storage.UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { put } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();
const dataRef = storage.ref('users/david.json');

const blob = new Blob(
  [JSON.stringify({ name: 'david'}, null, 2)], 
  { type : 'application/json' }
);

put(davidRef, blob, { type : 'application/json' })
  .subscribe(snap => { console.log(snap.bytesTransferred) });
```

### `putString()`
The `putString()` function creates an observable that emits the upload progress of a file.

|                 |                                          |
|-----------------|------------------------------------------|
| **function**    | `putString()`                                  |
| **params**      | ref: `storage.Reference`, data: `string`, metadata?: `storage.UploadMetadata`                |
| **import path** | `rxfire/storage`                         |
| **return**      | `Observable<storage.UploadTaskSnapshot>` |

#### TypeScript Example
```ts
import { putString } from 'rxfire/storage';
import firebase from 'firebase';
import 'firebase/storage';

// Set up Firebase
const app = initializeApp({ /* config */ });
const storage = app.storage();
const davidRef = storage.ref('users/david.png');

const base64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

putString(davidRef, base64, { type : 'application/json' })
  .subscribe(snap => { console.log(snap.bytesTransferred) });
```
