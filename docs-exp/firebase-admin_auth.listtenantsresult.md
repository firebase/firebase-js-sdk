{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ListTenantsResult interface

Interface representing the object returned from a  operation. Contains the list of tenants for the current batch and the next page token if available.

<b>Signature:</b>

```typescript
export interface ListTenantsResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin_auth.listtenantsresult.md#listtenantsresultpagetoken_property) | string | The next page token if available. This is needed for the next batch download. |
|  [tenants](./firebase-admin_auth.listtenantsresult.md#listtenantsresulttenants_property) | [Tenant](./firebase-admin_.tenant.md#tenant_class)<!-- -->\[\] | The list of  objects for the downloaded batch. |

## ListTenantsResult.pageToken property

The next page token if available. This is needed for the next batch download.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListTenantsResult.tenants property

The list of  objects for the downloaded batch.

<b>Signature:</b>

```typescript
tenants: Tenant[];
```
{% endblock body %}
