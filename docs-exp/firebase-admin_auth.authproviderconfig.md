{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AuthProviderConfig interface

The base Auth provider configuration interface.

<b>Signature:</b>

```typescript
export interface AuthProviderConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin_auth.authproviderconfig.md#authproviderconfigdisplayname_property) | string | The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console. |
|  [enabled](./firebase-admin_auth.authproviderconfig.md#authproviderconfigenabled_property) | boolean | Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider. |
|  [providerId](./firebase-admin_auth.authproviderconfig.md#authproviderconfigproviderid_property) | string | The provider ID defined by the developer. For a SAML provider, this is always prefixed by <code>saml.</code>. For an OIDC provider, this is always prefixed by <code>oidc.</code>. |

## AuthProviderConfig.displayName property

The user-friendly display name to the current configuration. This name is also used as the provider label in the Cloud Console.

<b>Signature:</b>

```typescript
displayName?: string;
```

## AuthProviderConfig.enabled property

Whether the provider configuration is enabled or disabled. A user cannot sign in using a disabled provider.

<b>Signature:</b>

```typescript
enabled: boolean;
```

## AuthProviderConfig.providerId property

The provider ID defined by the developer. For a SAML provider, this is always prefixed by `saml.`<!-- -->. For an OIDC provider, this is always prefixed by `oidc.`<!-- -->.

<b>Signature:</b>

```typescript
providerId: string;
```
{% endblock body %}
