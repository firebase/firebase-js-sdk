---
'@firebase/functions': patch
---

Fixed an issue where a callable function that threw an `HttpsError` with the `ok` code was reported as an `internal` error with the message "Response is missing data field." (or rejected with `null` when streaming). The client now rejects with the error the function sent, because the callable protocol treats any response with an `error` field as a failure.
