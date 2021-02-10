{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UpdateRequest interface

Interface representing the properties to update on the provided user.

<b>Signature:</b>

```typescript
export interface UpdateRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [disabled](./firebase-admin_.updaterequest.md#updaterequestdisabled_property) | boolean | Whether or not the user is disabled: <code>true</code> for disabled; <code>false</code> for enabled. |
|  [displayName](./firebase-admin_.updaterequest.md#updaterequestdisplayname_property) | string \| null | The user's display name. |
|  [email](./firebase-admin_.updaterequest.md#updaterequestemail_property) | string | The user's primary email. |
|  [emailVerified](./firebase-admin_.updaterequest.md#updaterequestemailverified_property) | boolean | Whether or not the user's primary email is verified. |
|  [multiFactor](./firebase-admin_.updaterequest.md#updaterequestmultifactor_property) | [MultiFactorUpdateSettings](./firebase-admin_.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The user's updated multi-factor related properties. |
|  [password](./firebase-admin_.updaterequest.md#updaterequestpassword_property) | string | The user's unhashed password. |
|  [phoneNumber](./firebase-admin_.updaterequest.md#updaterequestphonenumber_property) | string \| null | The user's primary phone number. |
|  [photoURL](./firebase-admin_.updaterequest.md#updaterequestphotourl_property) | string \| null | The user's photo URL. |

## UpdateRequest.disabled property

Whether or not the user is disabled: `true` for disabled; `false` for enabled.

<b>Signature:</b>

```typescript
disabled?: boolean;
```

## UpdateRequest.displayName property

The user's display name.

<b>Signature:</b>

```typescript
displayName?: string | null;
```

## UpdateRequest.email property

The user's primary email.

<b>Signature:</b>

```typescript
email?: string;
```

## UpdateRequest.emailVerified property

Whether or not the user's primary email is verified.

<b>Signature:</b>

```typescript
emailVerified?: boolean;
```

## UpdateRequest.multiFactor property

The user's updated multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorUpdateSettings;
```

## UpdateRequest.password property

The user's unhashed password.

<b>Signature:</b>

```typescript
password?: string;
```

## UpdateRequest.phoneNumber property

The user's primary phone number.

<b>Signature:</b>

```typescript
phoneNumber?: string | null;
```

## UpdateRequest.photoURL property

The user's photo URL.

<b>Signature:</b>

```typescript
photoURL?: string | null;
```
{% endblock body %}
