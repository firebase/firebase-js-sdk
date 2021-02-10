{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## PerformanceSettings interface


<b>Signature:</b>

```typescript
export interface PerformanceSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [dataCollectionEnabled](./performance-types.performancesettings.md#performancesettingsdatacollectionenabled_property) | boolean | Whether to collect custom events. |
|  [instrumentationEnabled](./performance-types.performancesettings.md#performancesettingsinstrumentationenabled_property) | boolean | Whether to collect out of the box events. |

## PerformanceSettings.dataCollectionEnabled property

Whether to collect custom events.

<b>Signature:</b>

```typescript
dataCollectionEnabled?: boolean;
```

## PerformanceSettings.instrumentationEnabled property

Whether to collect out of the box events.

<b>Signature:</b>

```typescript
instrumentationEnabled?: boolean;
```
{% endblock body %}
