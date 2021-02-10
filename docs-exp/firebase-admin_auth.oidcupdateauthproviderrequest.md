{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## OIDCUpdateAuthProviderRequest interface

The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via .

<b>Signature:</b>

```typescript
export interface OIDCUpdateAuthProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [clientId](./firebase-admin_auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestclientid_property) | string | The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified. |
|  [displayName](./firebase-admin_auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestdisplayname_property) | string | The OIDC provider's updated display name. If not provided, the existing configuration's value is not modified. |
|  [enabled](./firebase-admin_auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestenabled_property) | boolean | Whether the OIDC provider is enabled or not. If not provided, the existing configuration's setting is not modified. |
|  [issuer](./firebase-admin_auth.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequestissuer_property) | string | The OIDC provider's updated issuer. If not provided, the existing configuration's value is not modified. |

## OIDCUpdateAuthProviderRequest.clientId property

The OIDC provider's updated client ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
clientId?: string;
```

## OIDCUpdateAuthProviderRequest.displayName property

The OIDC provider's updated display name. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
displayName?: string;
```

## OIDCUpdateAuthProviderRequest.enabled property

Whether the OIDC provider is enabled or not. If not provided, the existing configuration's setting is not modified.

<b>Signature:</b>

```typescript
enabled?: boolean;
```

## OIDCUpdateAuthProviderRequest.issuer property

The OIDC provider's updated issuer. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
issuer?: string;
```
{% endblock body %}
