{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## SAMLUpdateAuthProviderRequest interface

The request interface for updating a SAML Auth provider. This is used when updating a SAML provider's configuration via .

<b>Signature:</b>

```typescript
export interface SAMLUpdateAuthProviderRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [callbackURL](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestcallbackurl_property) | string | The SAML provider's callback URL. If not provided, the existing configuration's value is not modified. |
|  [displayName](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestdisplayname_property) | string | The SAML provider's updated display name. If not provided, the existing configuration's value is not modified. |
|  [enabled](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestenabled_property) | boolean | Whether the SAML provider is enabled or not. If not provided, the existing configuration's setting is not modified. |
|  [idpEntityId](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestidpentityid_property) | string | The SAML provider's updated IdP entity ID. If not provided, the existing configuration's value is not modified. |
|  [rpEntityId](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestrpentityid_property) | string | The SAML provider's updated RP entity ID. If not provided, the existing configuration's value is not modified. |
|  [ssoURL](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestssourl_property) | string | The SAML provider's updated SSO URL. If not provided, the existing configuration's value is not modified. |
|  [x509Certificates](./firebase-admin_auth.samlupdateauthproviderrequest.md#samlupdateauthproviderrequestx509certificates_property) | string\[\] | The SAML provider's updated list of X.509 certificated. If not provided, the existing configuration list is not modified. |

## SAMLUpdateAuthProviderRequest.callbackURL property

The SAML provider's callback URL. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
callbackURL?: string;
```

## SAMLUpdateAuthProviderRequest.displayName property

The SAML provider's updated display name. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
displayName?: string;
```

## SAMLUpdateAuthProviderRequest.enabled property

Whether the SAML provider is enabled or not. If not provided, the existing configuration's setting is not modified.

<b>Signature:</b>

```typescript
enabled?: boolean;
```

## SAMLUpdateAuthProviderRequest.idpEntityId property

The SAML provider's updated IdP entity ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
idpEntityId?: string;
```

## SAMLUpdateAuthProviderRequest.rpEntityId property

The SAML provider's updated RP entity ID. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
rpEntityId?: string;
```

## SAMLUpdateAuthProviderRequest.ssoURL property

The SAML provider's updated SSO URL. If not provided, the existing configuration's value is not modified.

<b>Signature:</b>

```typescript
ssoURL?: string;
```

## SAMLUpdateAuthProviderRequest.x509Certificates property

The SAML provider's updated list of X.509 certificated. If not provided, the existing configuration list is not modified.

<b>Signature:</b>

```typescript
x509Certificates?: string[];
```
{% endblock body %}
