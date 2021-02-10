{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserMetadataRequest interface

User metadata to include when importing a user.

<b>Signature:</b>

```typescript
export interface UserMetadataRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [creationTime](./firebase-admin_auth.usermetadatarequest.md#usermetadatarequestcreationtime_property) | string | The date the user was created, formatted as a UTC string. |
|  [lastSignInTime](./firebase-admin_auth.usermetadatarequest.md#usermetadatarequestlastsignintime_property) | string | The date the user last signed in, formatted as a UTC string. |

## UserMetadataRequest.creationTime property

The date the user was created, formatted as a UTC string.

<b>Signature:</b>

```typescript
creationTime?: string;
```

## UserMetadataRequest.lastSignInTime property

The date the user last signed in, formatted as a UTC string.

<b>Signature:</b>

```typescript
lastSignInTime?: string;
```
{% endblock body %}
