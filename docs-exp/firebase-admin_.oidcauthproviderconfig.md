{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## OIDCAuthProviderConfig interface

The \[OIDC\](https://openid.net/specs/openid-connect-core-1\_0-final.html) Auth provider configuration interface. An OIDC provider can be created via .

<b>Signature:</b>

```typescript
export interface OIDCAuthProviderConfig extends AuthProviderConfig 
```
<b>Extends:</b> [AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientId](./firebase-admin_.oidcauthproviderconfig.md#oidcauthproviderconfigclientid_property) | string | This is the required client ID used to confirm the audience of an OIDC provider's \[ID token\](https://openid.net/specs/openid-connect-core-1\_0-final.html\#IDToken). |
|  [issuer](./firebase-admin_.oidcauthproviderconfig.md#oidcauthproviderconfigissuer_property) | string | This is the required provider issuer used to match the provider issuer of the ID token and to determine the corresponding OIDC discovery document, eg. \[<code>/.well-known/openid-configuration</code>\](https://openid.net/specs/openid-connect-discovery-1\_0.html\#ProviderConfig). This is needed for the following: <ul> <li>To verify the provided issuer.</li> <li>Determine the authentication/authorization endpoint during the OAuth <code>id_token</code> authentication flow.</li> <li>To retrieve the public signing keys via <code>jwks_uri</code> to verify the OIDC provider's ID token's signature.</li> <li>To determine the claims\_supported to construct the user attributes to be returned in the additional user info response.</li> </ul> ID token validation will be performed as defined in the \[spec\](https://openid.net/specs/openid-connect-core-1\_0.html\#IDTokenValidation). |

## OIDCAuthProviderConfig.clientId property

This is the required client ID used to confirm the audience of an OIDC provider's \[ID token\](https://openid.net/specs/openid-connect-core-1\_0-final.html\#IDToken).

<b>Signature:</b>

```typescript
clientId: string;
```

## OIDCAuthProviderConfig.issuer property

This is the required provider issuer used to match the provider issuer of the ID token and to determine the corresponding OIDC discovery document, eg. \[`/.well-known/openid-configuration`<!-- -->\](https://openid.net/specs/openid-connect-discovery-1\_0.html\#ProviderConfig). This is needed for the following: <ul> <li>To verify the provided issuer.</li> <li>Determine the authentication/authorization endpoint during the OAuth `id_token` authentication flow.</li> <li>To retrieve the public signing keys via `jwks_uri` to verify the OIDC provider's ID token's signature.</li> <li>To determine the claims\_supported to construct the user attributes to be returned in the additional user info response.</li> </ul> ID token validation will be performed as defined in the \[spec\](https://openid.net/specs/openid-connect-core-1\_0.html\#IDTokenValidation).

<b>Signature:</b>

```typescript
issuer: string;
```
{% endblock body %}
