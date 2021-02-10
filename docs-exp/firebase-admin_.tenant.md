{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Tenant class

Tenant class that defines a Firebase Auth tenant.

<b>Signature:</b>

```typescript
export declare class Tenant 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [displayName](./firebase-admin_.tenant.md#tenantdisplayname_property) |  | string |  |
|  [emailSignInConfig](./firebase-admin_.tenant.md#tenantemailsigninconfig_property) |  | [EmailSignInProviderConfig](./firebase-admin_.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) \| undefined |  |
|  [multiFactorConfig](./firebase-admin_.tenant.md#tenantmultifactorconfig_property) |  | [MultiFactorConfig](./firebase-admin_.multifactorconfig.md#multifactorconfig_interface) \| undefined |  |
|  [tenantId](./firebase-admin_.tenant.md#tenanttenantid_property) |  | string |  |
|  [testPhoneNumbers](./firebase-admin_.tenant.md#tenanttestphonenumbers_property) |  | { \[phoneNumber: string\]: string; } |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_.tenant.md#tenanttojson_method) |  |  {<!-- -->object<!-- -->} The plain object representation of the tenant. |

## Tenant.displayName property

<b>Signature:</b>

```typescript
readonly displayName?: string;
```

## Tenant.emailSignInConfig property

<b>Signature:</b>

```typescript
get emailSignInConfig(): EmailSignInProviderConfig | undefined;
```

## Tenant.multiFactorConfig property

<b>Signature:</b>

```typescript
get multiFactorConfig(): MultiFactorConfig | undefined;
```

## Tenant.tenantId property

<b>Signature:</b>

```typescript
readonly tenantId: string;
```

## Tenant.testPhoneNumbers property

<b>Signature:</b>

```typescript
readonly testPhoneNumbers?: {
        [phoneNumber: string]: string;
    };
```

## Tenant.toJSON() method

 {<!-- -->object<!-- -->} The plain object representation of the tenant.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

{% endblock body %}
