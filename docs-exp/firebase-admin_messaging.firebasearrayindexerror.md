{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## FirebaseArrayIndexError interface

Composite type which includes both a `FirebaseError` object and an index which can be used to get the errored item.

<b>Signature:</b>

```typescript
export interface FirebaseArrayIndexError 
```

## Example


```javascript
var registrationTokens = [token1, token2, token3];
admin.messaging().subscribeToTopic(registrationTokens, 'topic-name')
  .then(function(response) {
    if (response.failureCount > 0) {
      console.log("Following devices unsucessfully subscribed to topic:");
      response.errors.forEach(function(error) {
        var invalidToken = registrationTokens[error.index];
        console.log(invalidToken, error.error);
      });
    } else {
      console.log("All devices successfully subscribed to topic:", response);
    }
  })
  .catch(function(error) {
    console.log("Error subscribing to topic:", error);
  });

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [error](./firebase-admin_messaging.firebasearrayindexerror.md#firebasearrayindexerrorerror_property) | [FirebaseError](./firebase-admin_.firebaseerror.md#firebaseerror_interface) | The error object. |
|  [index](./firebase-admin_messaging.firebasearrayindexerror.md#firebasearrayindexerrorindex_property) | number | The index of the errored item within the original array passed as part of the called API method. |

## FirebaseArrayIndexError.error property

The error object.

<b>Signature:</b>

```typescript
error: FirebaseError;
```

## FirebaseArrayIndexError.index property

The index of the errored item within the original array passed as part of the called API method.

<b>Signature:</b>

```typescript
index: number;
```
{% endblock body %}
