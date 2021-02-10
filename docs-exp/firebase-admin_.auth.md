{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Auth class

Auth service bound to the provided app. An Auth instance can have multiple tenants.

<b>Signature:</b>

```typescript
export declare class Auth extends BaseAuth 
```
<b>Extends:</b> [BaseAuth](./firebase-admin_.baseauth.md#baseauth_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [app](./firebase-admin_.auth.md#authapp_property) |  | [App](./firebase-admin_.app.md#app_interface) | Returns the app associated with this Auth instance. The app associated with this Auth instance. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [tenantManager()](./firebase-admin_.auth.md#authtenantmanager_method) |  |  The current Auth instance's tenant manager. |

## Auth.app property

Returns the app associated with this Auth instance.

 The app associated with this Auth instance.

<b>Signature:</b>

```typescript
get app(): App;
```

## Auth.tenantManager() method

 The current Auth instance's tenant manager.

<b>Signature:</b>

```typescript
tenantManager(): TenantManager;
```
<b>Returns:</b>

[TenantManager](./firebase-admin_.tenantmanager.md#tenantmanager_class)

{% endblock body %}
