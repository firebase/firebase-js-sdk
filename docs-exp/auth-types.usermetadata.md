{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## UserMetadata interface

Interface representing a user's metadata.

<b>Signature:</b>

```typescript
export interface UserMetadata 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [creationTime](./auth-types.usermetadata.md#usermetadatacreationtime_property) | string | Time the user was created. |
|  [lastSignInTime](./auth-types.usermetadata.md#usermetadatalastsignintime_property) | string | Time the user last signed in. |

## UserMetadata.creationTime property

Time the user was created.

<b>Signature:</b>

```typescript
readonly creationTime?: string;
```

## UserMetadata.lastSignInTime property

Time the user last signed in.

<b>Signature:</b>

```typescript
readonly lastSignInTime?: string;
```
{% endblock body %}
