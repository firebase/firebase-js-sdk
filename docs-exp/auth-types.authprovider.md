{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## AuthProvider interface

Interface that represents an auth provider, used to facilitate creating [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export interface AuthProvider 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [providerId](./auth-types.authprovider.md#authproviderproviderid_property) | string | Provider for which credentials can be constructed. |

## AuthProvider.providerId property

Provider for which credentials can be constructed.

<b>Signature:</b>

```typescript
readonly providerId: string;
```
{% endblock body %}
