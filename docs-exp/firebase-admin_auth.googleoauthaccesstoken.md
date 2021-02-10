{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## GoogleOAuthAccessToken interface

Interface for Google OAuth 2.0 access tokens.

<b>Signature:</b>

```typescript
export interface GoogleOAuthAccessToken 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [access\_token](./firebase-admin_auth.googleoauthaccesstoken.md#googleoauthaccesstokenaccess_token_property) | string |  |
|  [expires\_in](./firebase-admin_auth.googleoauthaccesstoken.md#googleoauthaccesstokenexpires_in_property) | number |  |

## GoogleOAuthAccessToken.access\_token property

<b>Signature:</b>

```typescript
access_token: string;
```

## GoogleOAuthAccessToken.expires\_in property

<b>Signature:</b>

```typescript
expires_in: number;
```
{% endblock body %}
