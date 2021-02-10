{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ProviderIdentifier interface

Used for looking up an account by federated provider.

See auth.getUsers()

<b>Signature:</b>

```typescript
export interface ProviderIdentifier 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [providerId](./firebase-admin_auth.provideridentifier.md#provideridentifierproviderid_property) | string |  |
|  [providerUid](./firebase-admin_auth.provideridentifier.md#provideridentifierprovideruid_property) | string |  |

## ProviderIdentifier.providerId property

<b>Signature:</b>

```typescript
providerId: string;
```

## ProviderIdentifier.providerUid property

<b>Signature:</b>

```typescript
providerUid: string;
```
{% endblock body %}
