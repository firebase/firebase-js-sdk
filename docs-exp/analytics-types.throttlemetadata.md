{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ThrottleMetadata interface

Encapsulates metadata concerning throttled fetch requests.

<b>Signature:</b>

```typescript
export interface ThrottleMetadata 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [backoffCount](./analytics-types.throttlemetadata.md#throttlemetadatabackoffcount_property) | number |  |
|  [throttleEndTimeMillis](./analytics-types.throttlemetadata.md#throttlemetadatathrottleendtimemillis_property) | number |  |

## ThrottleMetadata.backoffCount property

<b>Signature:</b>

```typescript
backoffCount: number;
```

## ThrottleMetadata.throttleEndTimeMillis property

<b>Signature:</b>

```typescript
throttleEndTimeMillis: number;
```
{% endblock body %}
