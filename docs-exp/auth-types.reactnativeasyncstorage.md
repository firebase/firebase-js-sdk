{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ReactNativeAsyncStorage interface

Interface for a supplied AsyncStorage.

<b>Signature:</b>

```typescript
export interface ReactNativeAsyncStorage 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [getItem(key)](./auth-types.reactnativeasyncstorage.md#reactnativeasyncstoragegetitem_method) | Retrieve an item from storage. |
|  [removeItem(key)](./auth-types.reactnativeasyncstorage.md#reactnativeasyncstorageremoveitem_method) | Remove an item from storage. |
|  [setItem(key, value)](./auth-types.reactnativeasyncstorage.md#reactnativeasyncstoragesetitem_method) | Persist an item in storage. |

## ReactNativeAsyncStorage.getItem() method

Retrieve an item from storage.

<b>Signature:</b>

```typescript
getItem(key: string): Promise<string | null>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | string | storage key. |

<b>Returns:</b>

Promise&lt;string \| null&gt;

## ReactNativeAsyncStorage.removeItem() method

Remove an item from storage.

<b>Signature:</b>

```typescript
removeItem(key: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | string | storage key. |

<b>Returns:</b>

Promise&lt;void&gt;

## ReactNativeAsyncStorage.setItem() method

Persist an item in storage.

<b>Signature:</b>

```typescript
setItem(key: string, value: string): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  key | string | storage key. |
|  value | string | storage value. |

<b>Returns:</b>

Promise&lt;void&gt;

{% endblock body %}
