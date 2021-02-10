{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## UserCredential interface

A structure containing a [User](./auth-types.user.md#user_interface)<!-- -->, an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->, the [OperationType](./auth-types.md#operationtype_enum)<!-- -->, and any additional user information that was returned from the identity provider.

<b>Signature:</b>

```typescript
export interface UserCredential 
```

## Remarks

`operationType` could be [OperationType.SIGN\_IN](./auth-types.md#operationtypesign_in_enummember) for a sign-in operation, [OperationType.LINK](./auth-types.md#operationtypelink_enummember) for a linking operation and [OperationType.REAUTHENTICATE](./auth-types.md#operationtypereauthenticate_enummember) for a reauthentication operation.

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [operationType](./auth-types.usercredential.md#usercredentialoperationtype_property) | [OperationType](./auth-types.md#operationtype_enum) | The type of operation which was used to authenticate the user (such as sign-in or link). |
|  [providerId](./auth-types.usercredential.md#usercredentialproviderid_property) | string \| null | The provider which was used to authenticate the user. |
|  [user](./auth-types.usercredential.md#usercredentialuser_property) | [User](./auth-types.user.md#user_interface) | The user authenticated by this credential. |

## UserCredential.operationType property

The type of operation which was used to authenticate the user (such as sign-in or link).

<b>Signature:</b>

```typescript
operationType: OperationType;
```

## UserCredential.providerId property

The provider which was used to authenticate the user.

<b>Signature:</b>

```typescript
providerId: string | null;
```

## UserCredential.user property

The user authenticated by this credential.

<b>Signature:</b>

```typescript
user: User;
```
{% endblock body %}
