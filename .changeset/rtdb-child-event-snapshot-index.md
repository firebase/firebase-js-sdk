---
'@firebase/database': patch
---

Fix `DataSnapshot.forEach()` throwing `No index defined for <path>` on snapshots delivered to `onChildAdded()`, `onChildChanged()`, and `onChildMoved()` listeners registered on an `orderByChild()` or `orderByValue()` query. Child event snapshots now iterate their own children by priority, matching `get()` and nested `forEach()` snapshots; the query's index continues to order the children of the queried location.
