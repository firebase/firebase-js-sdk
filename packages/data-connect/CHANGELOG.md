## Unreleased
* Added app check support # @firebase/data-connect

## 0.0.3
* Updated reporting to use @firebase/data-connect instead of @firebase/connect.
* Added functionality to retry queries and mutations if the server responds with UNAUTHENTICATED.
* Moved `validateArgs` to core SDK.
* Updated errors to only show relevant details to the user.
* Added ability to track whether user is calling core sdk or generated sdk.

