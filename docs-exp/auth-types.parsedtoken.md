{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ParsedToken interface

Interface representing a parsed ID token.

<b>Signature:</b>

```typescript
export interface ParsedToken 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [auth\_time](./auth-types.parsedtoken.md#parsedtokenauth_time_property) | string | Time at which authentication was performed. |
|  [exp](./auth-types.parsedtoken.md#parsedtokenexp_property) | string | Expiration time of the token. |
|  [firebase](./auth-types.parsedtoken.md#parsedtokenfirebase_property) | { 'sign\_in\_provider'?: string; 'sign\_in\_second\_factor'?: string; } | Firebase specific claims, containing the provider(s) used to authenticate the user. |
|  [iat](./auth-types.parsedtoken.md#parsedtokeniat_property) | string | Issuance time of the token. |
|  [sub](./auth-types.parsedtoken.md#parsedtokensub_property) | string | UID of the user. |

## ParsedToken.auth\_time property

Time at which authentication was performed.

<b>Signature:</b>

```typescript
'auth_time'?: string;
```

## ParsedToken.exp property

Expiration time of the token.

<b>Signature:</b>

```typescript
'exp'?: string;
```

## ParsedToken.firebase property

Firebase specific claims, containing the provider(s) used to authenticate the user.

<b>Signature:</b>

```typescript
'firebase'?: {
    'sign_in_provider'?: string;
    'sign_in_second_factor'?: string;
  };
```

## ParsedToken.iat property

Issuance time of the token.

<b>Signature:</b>

```typescript
'iat'?: string;
```

## ParsedToken.sub property

UID of the user.

<b>Signature:</b>

```typescript
'sub'?: string;
```
{% endblock body %}
