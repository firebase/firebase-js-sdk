{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## FirebasePerformance interface


<b>Signature:</b>

```typescript
export interface FirebasePerformance 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [dataCollectionEnabled](./performance-types.firebaseperformance.md#firebaseperformancedatacollectionenabled_property) | boolean | Controls the logging of custom traces. |
|  [instrumentationEnabled](./performance-types.firebaseperformance.md#firebaseperformanceinstrumentationenabled_property) | boolean | Controls the logging of automatic traces and HTTP/S network monitoring. |

## FirebasePerformance.dataCollectionEnabled property

Controls the logging of custom traces.

<b>Signature:</b>

```typescript
dataCollectionEnabled: boolean;
```

## FirebasePerformance.instrumentationEnabled property

Controls the logging of automatic traces and HTTP/S network monitoring.

<b>Signature:</b>

```typescript
instrumentationEnabled: boolean;
```
{% endblock body %}
