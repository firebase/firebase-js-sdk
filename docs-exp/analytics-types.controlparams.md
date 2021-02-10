{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ControlParams interface

Standard gtag.js control parameters. For more information, see [the gtag.js documentation on parameters](https://developers.google.com/gtagjs/reference/parameter)<!-- -->.

<b>Signature:</b>

```typescript
export interface ControlParams 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [event\_callback](./analytics-types.controlparams.md#controlparamsevent_callback_property) | () =&gt; void |  |
|  [event\_timeout](./analytics-types.controlparams.md#controlparamsevent_timeout_property) | number |  |
|  [groups](./analytics-types.controlparams.md#controlparamsgroups_property) | string \| string\[\] |  |
|  [send\_to](./analytics-types.controlparams.md#controlparamssend_to_property) | string \| string\[\] |  |

## ControlParams.event\_callback property

<b>Signature:</b>

```typescript
event_callback?: () => void;
```

## ControlParams.event\_timeout property

<b>Signature:</b>

```typescript
event_timeout?: number;
```

## ControlParams.groups property

<b>Signature:</b>

```typescript
groups?: string | string[];
```

## ControlParams.send\_to property

<b>Signature:</b>

```typescript
send_to?: string | string[];
```
{% endblock body %}
