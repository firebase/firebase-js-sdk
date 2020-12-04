---
"rxfire": patch
---

Addressing several bugs with `rxfire/storage` and cleaning up some poorly defined behavior:

* `fromTask` should not cancel the task on unsubscribe
* `fromTask` should immediately emit the current snapshot
* `fromTask` should return a `success` snapshot before completion
* `fromTask` should emit a `canceled` or `error` snapshot before erroring
* `progress` should now correctly report 100% uploads as it uses `fromTask`
* `put` and `putString` are now cold, only starting upload on subscription, will replay, and cancel the upload when all subscribers unsubscribe
