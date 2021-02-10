{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## OAuthCredentialOptions interface

Defines the options for initializing an [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export interface OAuthCredentialOptions 
```

## Remarks

For ID tokens with nonce claim, the raw nonce has to also be provided.

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [accessToken](./auth.oauthcredentialoptions.md#oauthcredentialoptionsaccesstoken_property) | string | The OAuth access token used to initialize the [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->. |
|  [idToken](./auth.oauthcredentialoptions.md#oauthcredentialoptionsidtoken_property) | string | The OAuth ID token used to initialize the [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->. |
|  [rawNonce](./auth.oauthcredentialoptions.md#oauthcredentialoptionsrawnonce_property) | string | The raw nonce associated with the ID token. |

## OAuthCredentialOptions.accessToken property

The OAuth access token used to initialize the [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
accessToken?: string;
```

## OAuthCredentialOptions.idToken property

The OAuth ID token used to initialize the [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
idToken?: string;
```

## OAuthCredentialOptions.rawNonce property

The raw nonce associated with the ID token.

<b>Signature:</b>

```typescript
rawNonce?: string;
```

## Remarks

It is required when an ID token with a nonce field is provided. The SHA-256 hash of the raw nonce must match the nonce field in the ID token.

{% endblock body %}
