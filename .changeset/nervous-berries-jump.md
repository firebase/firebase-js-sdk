---
'@firebase/rules-unit-testing': minor
---

Added a return type to the function `withSecurityRulesDisabled` that is the same as the return type of its callback.  
It is more convenient for this function to return the return type of the callback, e.g. when context.firestore() is used to retrieve a document reference, this document reference can be returned directly, instead of using it in the callback, or assigning it to a variable, initialized outside of the callback function.

### Current workflow
```typescript
let data
await withSecurityRulesDisabled(async context => {
  const fs = context.firestore()
  data = await getDoc(fs.doc('firestore_path'))
})
```

### Suggested workflow
```typescript
const data = await withSecurityRulesDisabled(async context => {
  const fs = context.firestore()
  return getDoc(fs.doc('firestore_path'))
})
```
