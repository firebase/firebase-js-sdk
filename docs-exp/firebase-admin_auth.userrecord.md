{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserRecord class

User record class that defines the Firebase user object populated from the Firebase Auth getAccountInfo response.

<b>Signature:</b>

```typescript
export declare class UserRecord 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [customClaims](./firebase-admin_auth.userrecord.md#userrecordcustomclaims_property) |  | { \[key: string\]: any; } |  |
|  [disabled](./firebase-admin_auth.userrecord.md#userrecorddisabled_property) |  | boolean |  |
|  [displayName](./firebase-admin_auth.userrecord.md#userrecorddisplayname_property) |  | string |  |
|  [email](./firebase-admin_auth.userrecord.md#userrecordemail_property) |  | string |  |
|  [emailVerified](./firebase-admin_auth.userrecord.md#userrecordemailverified_property) |  | boolean |  |
|  [metadata](./firebase-admin_auth.userrecord.md#userrecordmetadata_property) |  | [UserMetadata](./firebase-admin_.usermetadata.md#usermetadata_class) |  |
|  [multiFactor](./firebase-admin_auth.userrecord.md#userrecordmultifactor_property) |  | [MultiFactorSettings](./firebase-admin_.multifactorsettings.md#multifactorsettings_class) |  |
|  [passwordHash](./firebase-admin_auth.userrecord.md#userrecordpasswordhash_property) |  | string |  |
|  [passwordSalt](./firebase-admin_auth.userrecord.md#userrecordpasswordsalt_property) |  | string |  |
|  [phoneNumber](./firebase-admin_auth.userrecord.md#userrecordphonenumber_property) |  | string |  |
|  [photoURL](./firebase-admin_auth.userrecord.md#userrecordphotourl_property) |  | string |  |
|  [providerData](./firebase-admin_auth.userrecord.md#userrecordproviderdata_property) |  | [UserInfo](./firebase-admin_.userinfo.md#userinfo_class)<!-- -->\[\] |  |
|  [tenantId](./firebase-admin_auth.userrecord.md#userrecordtenantid_property) |  | string \| null |  |
|  [tokensValidAfterTime](./firebase-admin_auth.userrecord.md#userrecordtokensvalidaftertime_property) |  | string |  |
|  [uid](./firebase-admin_auth.userrecord.md#userrecorduid_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_auth.userrecord.md#userrecordtojson_method) |  |  The plain object representation of the user record. |

## UserRecord.customClaims property

<b>Signature:</b>

```typescript
readonly customClaims: {
        [key: string]: any;
    };
```

## UserRecord.disabled property

<b>Signature:</b>

```typescript
readonly disabled: boolean;
```

## UserRecord.displayName property

<b>Signature:</b>

```typescript
readonly displayName: string;
```

## UserRecord.email property

<b>Signature:</b>

```typescript
readonly email: string;
```

## UserRecord.emailVerified property

<b>Signature:</b>

```typescript
readonly emailVerified: boolean;
```

## UserRecord.metadata property

<b>Signature:</b>

```typescript
readonly metadata: UserMetadata;
```

## UserRecord.multiFactor property

<b>Signature:</b>

```typescript
readonly multiFactor?: MultiFactorSettings;
```

## UserRecord.passwordHash property

<b>Signature:</b>

```typescript
readonly passwordHash?: string;
```

## UserRecord.passwordSalt property

<b>Signature:</b>

```typescript
readonly passwordSalt?: string;
```

## UserRecord.phoneNumber property

<b>Signature:</b>

```typescript
readonly phoneNumber: string;
```

## UserRecord.photoURL property

<b>Signature:</b>

```typescript
readonly photoURL: string;
```

## UserRecord.providerData property

<b>Signature:</b>

```typescript
readonly providerData: UserInfo[];
```

## UserRecord.tenantId property

<b>Signature:</b>

```typescript
readonly tenantId?: string | null;
```

## UserRecord.tokensValidAfterTime property

<b>Signature:</b>

```typescript
readonly tokensValidAfterTime?: string;
```

## UserRecord.uid property

<b>Signature:</b>

```typescript
readonly uid: string;
```

## UserRecord.toJSON() method

 The plain object representation of the user record.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}
