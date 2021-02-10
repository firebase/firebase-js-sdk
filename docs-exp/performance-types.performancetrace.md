{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## PerformanceTrace interface


<b>Signature:</b>

```typescript
export interface PerformanceTrace 
```

## Methods

|  Method | Description |
|  --- | --- |
|  [getAttribute(attr)](./performance-types.performancetrace.md#performancetracegetattribute_method) | Retrieves the value which a custom attribute is set to. |
|  [getAttributes()](./performance-types.performancetrace.md#performancetracegetattributes_method) | Returns a map of all custom attributes of a trace instance. |
|  [getMetric(metricName)](./performance-types.performancetrace.md#performancetracegetmetric_method) | Returns the value of the custom metric by that name. If a custom metric with that name does not exist will return zero. |
|  [incrementMetric(metricName, num)](./performance-types.performancetrace.md#performancetraceincrementmetric_method) | Adds to the value of a custom metric. If a custom metric with the provided name does not exist, it creates one with that name and the value equal to the given number. The value will be floored down to an integer. |
|  [putAttribute(attr, value)](./performance-types.performancetrace.md#performancetraceputattribute_method) | Set a custom attribute of a trace to a certain value. |
|  [putMetric(metricName, num)](./performance-types.performancetrace.md#performancetraceputmetric_method) | Sets the value of the specified custom metric to the given number regardless of whether a metric with that name already exists on the trace instance or not. The value will be floored down to an integer. |
|  [record(startTime, duration, options)](./performance-types.performancetrace.md#performancetracerecord_method) | Records a trace from given parameters. This provides a direct way to use trace without a need to start/stop. This is useful for use cases in which the trace cannot directly be used (e.g. if the duration was captured before the Performance SDK was loaded). |
|  [removeAttribute(attr)](./performance-types.performancetrace.md#performancetraceremoveattribute_method) | Removes the specified custom attribute from a trace instance. |
|  [start()](./performance-types.performancetrace.md#performancetracestart_method) | Starts the timing for the trace instance. |
|  [stop()](./performance-types.performancetrace.md#performancetracestop_method) | Stops the timing of the trace instance and logs the data of the instance. |

## PerformanceTrace.getAttribute() method

Retrieves the value which a custom attribute is set to.

<b>Signature:</b>

```typescript
getAttribute(attr: string): string | undefined;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  attr | string | Name of the custom attribute. |

<b>Returns:</b>

string \| undefined

## PerformanceTrace.getAttributes() method

Returns a map of all custom attributes of a trace instance.

<b>Signature:</b>

```typescript
getAttributes(): { [key: string]: string };
```
<b>Returns:</b>

{ \[key: string\]: string }

## PerformanceTrace.getMetric() method

Returns the value of the custom metric by that name. If a custom metric with that name does not exist will return zero.

<b>Signature:</b>

```typescript
getMetric(metricName: string): number;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metricName | string | Name of the custom metric. |

<b>Returns:</b>

number

## PerformanceTrace.incrementMetric() method

Adds to the value of a custom metric. If a custom metric with the provided name does not exist, it creates one with that name and the value equal to the given number. The value will be floored down to an integer.

<b>Signature:</b>

```typescript
incrementMetric(metricName: string, num?: number): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metricName | string | The name of the custom metric. |
|  num | number | The number to be added to the value of the custom metric. If not provided, it uses a default value of one. |

<b>Returns:</b>

void

## PerformanceTrace.putAttribute() method

Set a custom attribute of a trace to a certain value.

<b>Signature:</b>

```typescript
putAttribute(attr: string, value: string): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  attr | string | Name of the custom attribute. |
|  value | string | Value of the custom attribute. |

<b>Returns:</b>

void

## PerformanceTrace.putMetric() method

Sets the value of the specified custom metric to the given number regardless of whether a metric with that name already exists on the trace instance or not. The value will be floored down to an integer.

<b>Signature:</b>

```typescript
putMetric(metricName: string, num: number): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  metricName | string | Name of the custom metric. |
|  num | number | Value to of the custom metric. |

<b>Returns:</b>

void

## PerformanceTrace.record() method

Records a trace from given parameters. This provides a direct way to use trace without a need to start/stop. This is useful for use cases in which the trace cannot directly be used (e.g. if the duration was captured before the Performance SDK was loaded).

<b>Signature:</b>

```typescript
record(
    startTime: number,
    duration: number,
    options?: {
      metrics?: { [key: string]: number };
      attributes?: { [key: string]: string };
    }
  ): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  startTime | number | trace start time since epoch in millisec. |
|  duration | number | The duraction of the trace in millisec. |
|  options | { metrics?: { \[key: string\]: number }; attributes?: { \[key: string\]: string }; } | An object which can optionally hold maps of custom metrics and custom attributes. |

<b>Returns:</b>

void

## PerformanceTrace.removeAttribute() method

Removes the specified custom attribute from a trace instance.

<b>Signature:</b>

```typescript
removeAttribute(attr: string): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  attr | string | Name of the custom attribute. |

<b>Returns:</b>

void

## PerformanceTrace.start() method

Starts the timing for the trace instance.

<b>Signature:</b>

```typescript
start(): void;
```
<b>Returns:</b>

void

## PerformanceTrace.stop() method

Stops the timing of the trace instance and logs the data of the instance.

<b>Signature:</b>

```typescript
stop(): void;
```
<b>Returns:</b>

void

{% endblock body %}
