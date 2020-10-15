---
"@firebase/app": patch
"@firebase/auth": patch
"@firebase/component": patch
"@firebase/database": patch
"firebase": major
"@firebase/firestore": patch
"@firebase/functions": patch
"@firebase/performance": patch
"@firebase/remote-config": patch
"rxfire": patch
"@firebase/util": patch
---

Point browser field to esm build. Now you need to use default import instead of namespace import to import firebase.

Before this change
```
import * as firebase from 'firebase/app';
```

After this change
```
import firebase from 'firebase/app';
```
