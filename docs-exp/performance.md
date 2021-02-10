{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## performance package

## Functions

|  Function | Description |
|  --- | --- |
|  [getPerformance(app, settings)](./performance.md#getperformance_function) | Returns a FirebasePerformance instance for the given app. |
|  [trace(performance, name)](./performance.md#trace_function) | Returns a new PerformanceTrace instance. |

## getPerformance() function

Returns a FirebasePerformance instance for the given app.

<b>Signature:</b>

```typescript
export declare function getPerformance(app: FirebaseApp, settings?: PerformanceSettings): FirebasePerformance;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface) | The FirebaseApp to use. |
|  settings | [PerformanceSettings](./performance-types.performancesettings.md#performancesettings_interface) | Optional settings for the Performance instance. |

<b>Returns:</b>

[FirebasePerformance](./performance-types.firebaseperformance.md#firebaseperformance_interface)

## trace() function

Returns a new PerformanceTrace instance.

<b>Signature:</b>

```typescript
export declare function trace(performance: FirebasePerformance, name: string): PerformanceTrace;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  performance | [FirebasePerformance](./performance-types.firebaseperformance.md#firebaseperformance_interface) | The FirebasePerformance instance to use. |
|  name | string | The name of the trace. |

<b>Returns:</b>

[PerformanceTrace](./performance-types.performancetrace.md#performancetrace_interface)

{% endblock body %}
