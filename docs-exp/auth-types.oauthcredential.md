{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## OAuthCredential class

Interface that represents the OAuth credentials returned by an [OAuthProvider](./auth.oauthprovider.md#oauthprovider_class)<!-- -->.

<b>Signature:</b>

```typescript
export abstract class OAuthCredential extends AuthCredential 
```
<b>Extends:</b> [AuthCredential](./auth-types.authcredential.md#authcredential_class)

## Remarks

Implementations specify the details about each auth provider's credential requirements.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [accessToken](./auth-types.oauthcredential.md#oauthcredentialaccesstoken_property) |  | string | The OAuth access token associated with the credential if it belongs to an [OAuthProvider](./auth.oauthprovider.md#oauthprovider_class)<!-- -->, such as <code>facebook.com</code>, <code>twitter.com</code>, etc. |
|  [idToken](./auth-types.oauthcredential.md#oauthcredentialidtoken_property) |  | string | The OAuth ID token associated with the credential if it belongs to an OIDC provider, such as <code>google.com</code>. |
|  [secret](./auth-types.oauthcredential.md#oauthcredentialsecret_property) |  | string | The OAuth access token secret associated with the credential if it belongs to an OAuth 1.0 provider, such as <code>twitter.com</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [fromJSON(json)](./auth-types.oauthcredential.md#oauthcredentialfromjson_method) | <code>static</code> | Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->. |

## OAuthCredential.accessToken property

The OAuth access token associated with the credential if it belongs to an [OAuthProvider](./auth.oauthprovider.md#oauthprovider_class)<!-- -->, such as `facebook.com`<!-- -->, `twitter.com`<!-- -->, etc.

<b>Signature:</b>

```typescript
readonly accessToken?: string;
```

## OAuthCredential.idToken property

The OAuth ID token associated with the credential if it belongs to an OIDC provider, such as `google.com`<!-- -->.

<b>Signature:</b>

```typescript
readonly idToken?: string;
```

## OAuthCredential.secret property

The OAuth access token secret associated with the credential if it belongs to an OAuth 1.0 provider, such as `twitter.com`<!-- -->.

<b>Signature:</b>

```typescript
readonly secret?: string;
```

## OAuthCredential.fromJSON() method

Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
static fromJSON(json: object | string): OAuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  json | object \| string | Input can be either Object or the stringified representation of the object. When string is provided, JSON.parse would be called first. |

<b>Returns:</b>

[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class) \| null

If the JSON input does not represent an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->, null is returned.

{% endblock body %}
