{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## MultiFactorError interface

The error thrown when the user needs to provide a second factor to sign in successfully.

<b>Signature:</b>

```typescript
export interface MultiFactorError extends AuthError 
```
<b>Extends:</b> [AuthError](./auth-types.autherror.md#autherror_interface)

## Remarks

The error code for this error is `auth/multi-factor-auth-required`<!-- -->.

## Example


```javascript
let resolver;
let multiFactorHints;

signInWithEmailAndPassword(auth, email, password)
    .then((result) => {
      // User signed in. No 2nd factor challenge is needed.
    })
    .catch((error) => {
      if (error.code == 'auth/multi-factor-auth-required') {
        resolver = getMultiFactorResolver(auth, error);
        multiFactorHints = resolver.hints;
      } else {
        // Handle other errors.
      }
    });

// Obtain a multiFactorAssertion by verifying the second factor.

const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [operationType](./auth-types.multifactorerror.md#multifactorerroroperationtype_property) | [OperationType](./auth-types.md#operationtype_enum) | The type of operation (e.g., sign-in, link, or reauthenticate) during which the error was raised. |

## MultiFactorError.operationType property

The type of operation (e.g., sign-in, link, or reauthenticate) during which the error was raised.

<b>Signature:</b>

```typescript
readonly operationType: OperationType;
```
{% endblock body %}
