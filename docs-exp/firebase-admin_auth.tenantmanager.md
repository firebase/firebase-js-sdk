{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## TenantManager class

Data structure used to help manage tenant related operations. This includes: - The ability to create, update, list, get and delete tenants for the underlying project. - Getting a TenantAwareAuth instance for running Auth related operations (user mgmt, provider config mgmt, etc) in the context of a specified tenant.

<b>Signature:</b>

```typescript
export declare class TenantManager 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [authForTenant(tenantId)](./firebase-admin_auth.tenantmanager.md#tenantmanagerauthfortenant_method) |  | Returns a TenantAwareAuth instance for the corresponding tenant ID. |
|  [createTenant(tenantOptions)](./firebase-admin_auth.tenantmanager.md#tenantmanagercreatetenant_method) |  | Creates a new tenant with the properties provided. |
|  [deleteTenant(tenantId)](./firebase-admin_auth.tenantmanager.md#tenantmanagerdeletetenant_method) |  | Deletes the tenant identified by the provided tenant ID and returns a promise that is fulfilled when the tenant is found and successfully deleted. |
|  [getTenant(tenantId)](./firebase-admin_auth.tenantmanager.md#tenantmanagergettenant_method) |  | Looks up the tenant identified by the provided tenant ID and returns a promise that is fulfilled with the corresponding tenant if it is found. |
|  [listTenants(maxResults, pageToken)](./firebase-admin_auth.tenantmanager.md#tenantmanagerlisttenants_method) |  | Exports a batch of tenant accounts. Batch size is determined by the maxResults argument. Starting point of the batch is determined by the pageToken argument. |
|  [updateTenant(tenantId, tenantOptions)](./firebase-admin_auth.tenantmanager.md#tenantmanagerupdatetenant_method) |  | Updates an existing tenant identified by the tenant ID with the properties provided. |

## TenantManager.authForTenant() method

Returns a TenantAwareAuth instance for the corresponding tenant ID.

<b>Signature:</b>

```typescript
authForTenant(tenantId: string): TenantAwareAuth;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant ID whose TenantAwareAuth is to be returned.  The corresponding TenantAwareAuth instance. |

<b>Returns:</b>

[TenantAwareAuth](./firebase-admin_.tenantawareauth.md#tenantawareauth_class)

## TenantManager.createTenant() method

Creates a new tenant with the properties provided.

<b>Signature:</b>

```typescript
createTenant(tenantOptions: CreateTenantRequest): Promise<Tenant>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantOptions | [CreateTenantRequest](./firebase-admin_.md#createtenantrequest_type) | The properties to set on the new tenant to be created.  A promise that resolves with the newly created tenant. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin_.tenant.md#tenant_class)<!-- -->&gt;

## TenantManager.deleteTenant() method

Deletes the tenant identified by the provided tenant ID and returns a promise that is fulfilled when the tenant is found and successfully deleted.

<b>Signature:</b>

```typescript
deleteTenant(tenantId: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant ID of the tenant to delete.  A promise that resolves when the tenant is successfully deleted. |

<b>Returns:</b>

Promise&lt;void&gt;

## TenantManager.getTenant() method

Looks up the tenant identified by the provided tenant ID and returns a promise that is fulfilled with the corresponding tenant if it is found.

<b>Signature:</b>

```typescript
getTenant(tenantId: string): Promise<Tenant>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant ID of the tenant to look up.  A promise that resolves with the corresponding tenant. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin_.tenant.md#tenant_class)<!-- -->&gt;

## TenantManager.listTenants() method

Exports a batch of tenant accounts. Batch size is determined by the maxResults argument. Starting point of the batch is determined by the pageToken argument.

<b>Signature:</b>

```typescript
listTenants(maxResults?: number, pageToken?: string): Promise<ListTenantsResult>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  maxResults | number | The page size, 1000 if undefined. This is also the maximum allowed limit. |
|  pageToken | string | The next page token. If not specified, returns users starting without any offset.  A promise that resolves with the current batch of downloaded tenants and the next page token. For the last page, an empty list of tenants and no page token are returned. |

<b>Returns:</b>

Promise&lt;[ListTenantsResult](./firebase-admin_.listtenantsresult.md#listtenantsresult_interface)<!-- -->&gt;

## TenantManager.updateTenant() method

Updates an existing tenant identified by the tenant ID with the properties provided.

<b>Signature:</b>

```typescript
updateTenant(tenantId: string, tenantOptions: UpdateTenantRequest): Promise<Tenant>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  tenantId | string | The tenant identifier of the tenant to update. |
|  tenantOptions | [UpdateTenantRequest](./firebase-admin_.updatetenantrequest.md#updatetenantrequest_interface) | The properties to update on the existing tenant.  A promise that resolves with the modified tenant. |

<b>Returns:</b>

Promise&lt;[Tenant](./firebase-admin_.tenant.md#tenant_class)<!-- -->&gt;

{% endblock body %}
