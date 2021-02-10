{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## functions-types package

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Functions](./functions-types.functions.md#functions_interface) | <code>Functions</code> represents a Functions instance, and is a required argument for all Functions operations. |
|  [FunctionsError](./functions-types.functionserror.md#functionserror_interface) |  |
|  [HttpsCallable](./functions-types.httpscallable.md#httpscallable_interface) | An HttpsCallable is a reference to a "callable" http trigger in Google Cloud Functions. |
|  [HttpsCallableOptions](./functions-types.httpscallableoptions.md#httpscallableoptions_interface) | HttpsCallableOptions specify metadata about how calls should be executed. |
|  [HttpsCallableResult](./functions-types.httpscallableresult.md#httpscallableresult_interface) | An HttpsCallableResult wraps a single result from a function call. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [FunctionsErrorCode](./functions-types.md#functionserrorcode_type) | The set of Firebase Functions status codes. The codes are the same at the ones exposed by gRPC here: https://github.com/grpc/grpc/blob/master/doc/statuscodes.md<!-- -->Possible values: - 'cancelled': The operation was cancelled (typically by the caller). - 'unknown': Unknown error or an error from a different error domain. - 'invalid-argument': Client specified an invalid argument. Note that this differs from 'failed-precondition'. 'invalid-argument' indicates arguments that are problematic regardless of the state of the system (e.g. an invalid field name). - 'deadline-exceeded': Deadline expired before operation could complete. For operations that change the state of the system, this error may be returned even if the operation has completed successfully. For example, a successful response from a server could have been delayed long enough for the deadline to expire. - 'not-found': Some requested document was not found. - 'already-exists': Some document that we attempted to create already exists. - 'permission-denied': The caller does not have permission to execute the specified operation. - 'resource-exhausted': Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system is out of space. - 'failed-precondition': Operation was rejected because the system is not in a state required for the operation's execution. - 'aborted': The operation was aborted, typically due to a concurrency issue like transaction aborts, etc. - 'out-of-range': Operation was attempted past the valid range. - 'unimplemented': Operation is not implemented or not supported/enabled. - 'internal': Internal errors. Means some invariants expected by underlying system has been broken. If you see one of these errors, something is very broken. - 'unavailable': The service is currently unavailable. This is most likely a transient condition and may be corrected by retrying with a backoff. - 'data-loss': Unrecoverable data loss or corruption. - 'unauthenticated': The request does not have valid authentication credentials for the operation. |

## FunctionsErrorCode type

The set of Firebase Functions status codes. The codes are the same at the ones exposed by gRPC here: https://github.com/grpc/grpc/blob/master/doc/statuscodes.md

Possible values: - 'cancelled': The operation was cancelled (typically by the caller). - 'unknown': Unknown error or an error from a different error domain. - 'invalid-argument': Client specified an invalid argument. Note that this differs from 'failed-precondition'. 'invalid-argument' indicates arguments that are problematic regardless of the state of the system (e.g. an invalid field name). - 'deadline-exceeded': Deadline expired before operation could complete. For operations that change the state of the system, this error may be returned even if the operation has completed successfully. For example, a successful response from a server could have been delayed long enough for the deadline to expire. - 'not-found': Some requested document was not found. - 'already-exists': Some document that we attempted to create already exists. - 'permission-denied': The caller does not have permission to execute the specified operation. - 'resource-exhausted': Some resource has been exhausted, perhaps a per-user quota, or perhaps the entire file system is out of space. - 'failed-precondition': Operation was rejected because the system is not in a state required for the operation's execution. - 'aborted': The operation was aborted, typically due to a concurrency issue like transaction aborts, etc. - 'out-of-range': Operation was attempted past the valid range. - 'unimplemented': Operation is not implemented or not supported/enabled. - 'internal': Internal errors. Means some invariants expected by underlying system has been broken. If you see one of these errors, something is very broken. - 'unavailable': The service is currently unavailable. This is most likely a transient condition and may be corrected by retrying with a backoff. - 'data-loss': Unrecoverable data loss or corruption. - 'unauthenticated': The request does not have valid authentication credentials for the operation.

<b>Signature:</b>

```typescript
export type FunctionsErrorCode =
  | 'ok'
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';
```
{% endblock body %}
