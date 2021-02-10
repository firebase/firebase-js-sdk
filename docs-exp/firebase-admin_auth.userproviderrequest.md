{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserProviderRequest interface

User provider data to include when importing a user.

<b>Signature:</b>

```typescript
export interface UserProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin_auth.userproviderrequest.md#userproviderrequestdisplayname_property) | string | The display name for the linked provider. |
|  [email](./firebase-admin_auth.userproviderrequest.md#userproviderrequestemail_property) | string | The email for the linked provider. |
|  [phoneNumber](./firebase-admin_auth.userproviderrequest.md#userproviderrequestphonenumber_property) | string | The phone number for the linked provider. |
|  [photoURL](./firebase-admin_auth.userproviderrequest.md#userproviderrequestphotourl_property) | string | The photo URL for the linked provider. |
|  [providerId](./firebase-admin_auth.userproviderrequest.md#userproviderrequestproviderid_property) | string | The linked provider ID (for example, "google.com" for the Google provider). |
|  [uid](./firebase-admin_auth.userproviderrequest.md#userproviderrequestuid_property) | string | The user identifier for the linked provider. |

## UserProviderRequest.displayName property

The display name for the linked provider.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UserProviderRequest.email property

The email for the linked provider.

<b>Signature:</b>

```typescript
email?: string;
```

## UserProviderRequest.phoneNumber property

The phone number for the linked provider.

<b>Signature:</b>

```typescript
phoneNumber?: string;
```

## UserProviderRequest.photoURL property

The photo URL for the linked provider.

<b>Signature:</b>

```typescript
photoURL?: string;
```

## UserProviderRequest.providerId property

The linked provider ID (for example, "google.com" for the Google provider).

<b>Signature:</b>

```typescript
providerId: string;
```

## UserProviderRequest.uid property

The user identifier for the linked provider.

<b>Signature:</b>

```typescript
uid: string;
```
{% endblock body %}
