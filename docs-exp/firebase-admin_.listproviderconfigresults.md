{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ListProviderConfigResults interface

The response interface for listing provider configs. This is only available when listing all identity providers' configurations via .

<b>Signature:</b>

```typescript
export interface ListProviderConfigResults 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin_.listproviderconfigresults.md#listproviderconfigresultspagetoken_property) | string | The next page token, if available. |
|  [providerConfigs](./firebase-admin_.listproviderconfigresults.md#listproviderconfigresultsproviderconfigs_property) | [AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface)<!-- -->\[\] | The list of providers for the specified type in the current page. |

## ListProviderConfigResults.pageToken property

The next page token, if available.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListProviderConfigResults.providerConfigs property

The list of providers for the specified type in the current page.

<b>Signature:</b>

```typescript
providerConfigs: AuthProviderConfig[];
```
{% endblock body %}
