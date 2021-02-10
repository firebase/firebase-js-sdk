{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UpdateMultiFactorInfoRequest interface

Interface representing common properties of a user enrolled second factor for an `UpdateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface UpdateMultiFactorInfoRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin_auth.updatemultifactorinforequest.md#updatemultifactorinforequestdisplayname_property) | string | The optional display name for an enrolled second factor. |
|  [enrollmentTime](./firebase-admin_auth.updatemultifactorinforequest.md#updatemultifactorinforequestenrollmenttime_property) | string | The optional date the second factor was enrolled, formatted as a UTC string. |
|  [factorId](./firebase-admin_auth.updatemultifactorinforequest.md#updatemultifactorinforequestfactorid_property) | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |
|  [uid](./firebase-admin_auth.updatemultifactorinforequest.md#updatemultifactorinforequestuid_property) | string | The ID of the enrolled second factor. This ID is unique to the user. When not provided, a new one is provisioned by the Auth server. |

## UpdateMultiFactorInfoRequest.displayName property

The optional display name for an enrolled second factor.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UpdateMultiFactorInfoRequest.enrollmentTime property

The optional date the second factor was enrolled, formatted as a UTC string.

<b>Signature:</b>

```typescript
enrollmentTime?: string;
```

## UpdateMultiFactorInfoRequest.factorId property

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
factorId: string;
```

## UpdateMultiFactorInfoRequest.uid property

The ID of the enrolled second factor. This ID is unique to the user. When not provided, a new one is provisioned by the Auth server.

<b>Signature:</b>

```typescript
uid?: string;
```
{% endblock body %}
