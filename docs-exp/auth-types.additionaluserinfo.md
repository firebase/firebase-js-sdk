{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AdditionalUserInfo interface

A structure containing additional user information from a federated identity provider.

<b>Signature:</b>

```typescript
export interface AdditionalUserInfo 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [isNewUser](./auth-types.additionaluserinfo.md#additionaluserinfoisnewuser_property) | boolean | Whether the user is new (created via sign-up) or existing (authenticated using sign-in). |
|  [profile](./auth-types.additionaluserinfo.md#additionaluserinfoprofile_property) | Record&lt;string, unknown&gt; \| null | Map containing IDP-specific user data. |
|  [providerId](./auth-types.additionaluserinfo.md#additionaluserinfoproviderid_property) | string \| null | Identifier for the provider used to authenticate this user. |
|  [username](./auth-types.additionaluserinfo.md#additionaluserinfousername_property) | string \| null | The username if the provider is GitHub or Twitter. |

## AdditionalUserInfo.isNewUser property

Whether the user is new (created via sign-up) or existing (authenticated using sign-in).

<b>Signature:</b>

```typescript
readonly isNewUser: boolean;
```

## AdditionalUserInfo.profile property

Map containing IDP-specific user data.

<b>Signature:</b>

```typescript
readonly profile: Record<string, unknown> | null;
```

## AdditionalUserInfo.providerId property

Identifier for the provider used to authenticate this user.

<b>Signature:</b>

```typescript
readonly providerId: string | null;
```

## AdditionalUserInfo.username property

The username if the provider is GitHub or Twitter.

<b>Signature:</b>

```typescript
readonly username?: string | null;
```
{% endblock body %}
