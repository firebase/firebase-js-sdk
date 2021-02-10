{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserImportRecord interface

Interface representing a user to import to Firebase Auth via the  method.

<b>Signature:</b>

```typescript
export interface UserImportRecord 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [customClaims](./firebase-admin_.userimportrecord.md#userimportrecordcustomclaims_property) | { \[key: string\]: any; } | The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token. |
|  [disabled](./firebase-admin_.userimportrecord.md#userimportrecorddisabled_property) | boolean | Whether or not the user is disabled: <code>true</code> for disabled; <code>false</code> for enabled. |
|  [displayName](./firebase-admin_.userimportrecord.md#userimportrecorddisplayname_property) | string | The user's display name. |
|  [email](./firebase-admin_.userimportrecord.md#userimportrecordemail_property) | string | The user's primary email, if set. |
|  [emailVerified](./firebase-admin_.userimportrecord.md#userimportrecordemailverified_property) | boolean | Whether or not the user's primary email is verified. |
|  [metadata](./firebase-admin_.userimportrecord.md#userimportrecordmetadata_property) | [UserMetadataRequest](./firebase-admin_.usermetadatarequest.md#usermetadatarequest_interface) | Additional metadata about the user. |
|  [multiFactor](./firebase-admin_.userimportrecord.md#userimportrecordmultifactor_property) | [MultiFactorUpdateSettings](./firebase-admin_.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The user's multi-factor related properties. |
|  [passwordHash](./firebase-admin_.userimportrecord.md#userimportrecordpasswordhash_property) | Buffer | The buffer of bytes representing the user's hashed password. When a user is to be imported with a password hash,  are required to be specified to identify the hashing algorithm used to generate this hash. |
|  [passwordSalt](./firebase-admin_.userimportrecord.md#userimportrecordpasswordsalt_property) | Buffer | The buffer of bytes representing the user's password salt. |
|  [phoneNumber](./firebase-admin_.userimportrecord.md#userimportrecordphonenumber_property) | string | The user's primary phone number, if set. |
|  [photoURL](./firebase-admin_.userimportrecord.md#userimportrecordphotourl_property) | string | The user's photo URL. |
|  [providerData](./firebase-admin_.userimportrecord.md#userimportrecordproviderdata_property) | [UserProviderRequest](./firebase-admin_.userproviderrequest.md#userproviderrequest_interface)<!-- -->\[\] | An array of providers (for example, Google, Facebook) linked to the user. |
|  [tenantId](./firebase-admin_.userimportrecord.md#userimportrecordtenantid_property) | string | The identifier of the tenant where user is to be imported to. When not provided in an <code>admin.auth.Auth</code> context, the user is uploaded to the default parent project. When not provided in an <code>admin.auth.TenantAwareAuth</code> context, the user is uploaded to the tenant corresponding to that <code>TenantAwareAuth</code> instance's tenant ID. |
|  [uid](./firebase-admin_.userimportrecord.md#userimportrecorduid_property) | string | The user's <code>uid</code>. |

## UserImportRecord.customClaims property

The user's custom claims object if available, typically used to define user roles and propagated to an authenticated user's ID token.

<b>Signature:</b>

```typescript
customClaims?: {
        [key: string]: any;
    };
```

## UserImportRecord.disabled property

Whether or not the user is disabled: `true` for disabled; `false` for enabled.

<b>Signature:</b>

```typescript
disabled?: boolean;
```

## UserImportRecord.displayName property

The user's display name.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UserImportRecord.email property

The user's primary email, if set.

<b>Signature:</b>

```typescript
email?: string;
```

## UserImportRecord.emailVerified property

Whether or not the user's primary email is verified.

<b>Signature:</b>

```typescript
emailVerified?: boolean;
```

## UserImportRecord.metadata property

Additional metadata about the user.

<b>Signature:</b>

```typescript
metadata?: UserMetadataRequest;
```

## UserImportRecord.multiFactor property

The user's multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorUpdateSettings;
```

## UserImportRecord.passwordHash property

The buffer of bytes representing the user's hashed password. When a user is to be imported with a password hash,  are required to be specified to identify the hashing algorithm used to generate this hash.

<b>Signature:</b>

```typescript
passwordHash?: Buffer;
```

## UserImportRecord.passwordSalt property

The buffer of bytes representing the user's password salt.

<b>Signature:</b>

```typescript
passwordSalt?: Buffer;
```

## UserImportRecord.phoneNumber property

The user's primary phone number, if set.

<b>Signature:</b>

```typescript
phoneNumber?: string;
```

## UserImportRecord.photoURL property

The user's photo URL.

<b>Signature:</b>

```typescript
photoURL?: string;
```

## UserImportRecord.providerData property

An array of providers (for example, Google, Facebook) linked to the user.

<b>Signature:</b>

```typescript
providerData?: UserProviderRequest[];
```

## UserImportRecord.tenantId property

The identifier of the tenant where user is to be imported to. When not provided in an `admin.auth.Auth` context, the user is uploaded to the default parent project. When not provided in an `admin.auth.TenantAwareAuth` context, the user is uploaded to the tenant corresponding to that `TenantAwareAuth` instance's tenant ID.

<b>Signature:</b>

```typescript
tenantId?: string;
```

## UserImportRecord.uid property

The user's `uid`<!-- -->.

<b>Signature:</b>

```typescript
uid: string;
```
{% endblock body %}
