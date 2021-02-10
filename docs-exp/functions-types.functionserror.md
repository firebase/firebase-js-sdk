{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## FunctionsError interface

<b>Signature:</b>

```typescript
export interface FunctionsError extends FirebaseError 
```
<b>Extends:</b> FirebaseError

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [code](./functions-types.functionserror.md#functionserrorcode_property) | [FunctionsErrorCode](./functions-types.md#functionserrorcode_type) | A standard error code that will be returned to the client. This also determines the HTTP status code of the response, as defined in code.proto. |
|  [details](./functions-types.functionserror.md#functionserrordetails_property) | any | Extra data to be converted to JSON and included in the error response. |

## FunctionsError.code property

A standard error code that will be returned to the client. This also determines the HTTP status code of the response, as defined in code.proto.

<b>Signature:</b>

```typescript
readonly code: FunctionsErrorCode;
```

## FunctionsError.details property

Extra data to be converted to JSON and included in the error response.

<b>Signature:</b>

```typescript
readonly details?: any;
```
{% endblock body %}
