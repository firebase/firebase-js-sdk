{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AuthError interface

Interface for an Auth error.

<b>Signature:</b>

```typescript
export interface AuthError extends FirebaseError 
```
<b>Extends:</b> FirebaseError

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [appName](./auth-types.autherror.md#autherrorappname_property) | string | The name of the Firebase App which triggered this error. |
|  [email](./auth-types.autherror.md#autherroremail_property) | string | The email of the user's account, used for sign-in/linking. |
|  [phoneNumber](./auth-types.autherror.md#autherrorphonenumber_property) | string | The phone number of the user's account, used for sign-in/linking. |
|  [tenantid](./auth-types.autherror.md#autherrortenantid_property) | string | The tenant ID being used for sign-in/linking. |

## AuthError.appName property

The name of the Firebase App which triggered this error.

<b>Signature:</b>

```typescript
readonly appName: string;
```

## AuthError.email property

The email of the user's account, used for sign-in/linking.

<b>Signature:</b>

```typescript
readonly email?: string;
```

## AuthError.phoneNumber property

The phone number of the user's account, used for sign-in/linking.

<b>Signature:</b>

```typescript
readonly phoneNumber?: string;
```

## AuthError.tenantid property

The tenant ID being used for sign-in/linking.

<b>Signature:</b>

```typescript
readonly tenantid?: string;
```

## Remarks

If you use [signInWithRedirect()](./auth.md#signinwithredirect_function) to sign in, you have to set the tenant ID on [Auth](./auth-types.auth.md#auth_interface) instance again as the tenant ID is not persisted after redirection.

{% endblock body %}
