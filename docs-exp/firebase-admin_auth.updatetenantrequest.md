{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UpdateTenantRequest interface

Interface representing the properties to update on the provided tenant.

<b>Signature:</b>

```typescript
export interface UpdateTenantRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin_auth.updatetenantrequest.md#updatetenantrequestdisplayname_property) | string | The tenant display name. |
|  [emailSignInConfig](./firebase-admin_auth.updatetenantrequest.md#updatetenantrequestemailsigninconfig_property) | [EmailSignInProviderConfig](./firebase-admin_.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) | The email sign in configuration. |
|  [multiFactorConfig](./firebase-admin_auth.updatetenantrequest.md#updatetenantrequestmultifactorconfig_property) | [MultiFactorConfig](./firebase-admin_.multifactorconfig.md#multifactorconfig_interface) | The multi-factor auth configuration to update on the tenant. |
|  [testPhoneNumbers](./firebase-admin_auth.updatetenantrequest.md#updatetenantrequesttestphonenumbers_property) | { \[phoneNumber: string\]: string; } \| null | The updated map containing the test phone number / code pairs for the tenant. Passing null clears the previously save phone number / code pairs. |

## UpdateTenantRequest.displayName property

The tenant display name.

<b>Signature:</b>

```typescript
displayName?: string;
```

## UpdateTenantRequest.emailSignInConfig property

The email sign in configuration.

<b>Signature:</b>

```typescript
emailSignInConfig?: EmailSignInProviderConfig;
```

## UpdateTenantRequest.multiFactorConfig property

The multi-factor auth configuration to update on the tenant.

<b>Signature:</b>

```typescript
multiFactorConfig?: MultiFactorConfig;
```

## UpdateTenantRequest.testPhoneNumbers property

The updated map containing the test phone number / code pairs for the tenant. Passing null clears the previously save phone number / code pairs.

<b>Signature:</b>

```typescript
testPhoneNumbers?: {
        [phoneNumber: string]: string;
    } | null;
```
{% endblock body %}
