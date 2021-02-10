{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## EmailSignInProviderConfig interface

The email sign in configuration.

<b>Signature:</b>

```typescript
export interface EmailSignInProviderConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [enabled](./firebase-admin_auth.emailsigninproviderconfig.md#emailsigninproviderconfigenabled_property) | boolean | Whether email provider is enabled. |
|  [passwordRequired](./firebase-admin_auth.emailsigninproviderconfig.md#emailsigninproviderconfigpasswordrequired_property) | boolean | Whether password is required for email sign-in. When not required, email sign-in can be performed with password or via email link sign-in. |

## EmailSignInProviderConfig.enabled property

Whether email provider is enabled.

<b>Signature:</b>

```typescript
enabled: boolean;
```

## EmailSignInProviderConfig.passwordRequired property

Whether password is required for email sign-in. When not required, email sign-in can be performed with password or via email link sign-in.

<b>Signature:</b>

```typescript
passwordRequired?: boolean;
```
{% endblock body %}
