{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## LightSettings interface

Represents settings to control notification LED that can be included in .

<b>Signature:</b>

```typescript
export interface LightSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [color](./firebase-admin_.lightsettings.md#lightsettingscolor_property) | string | Required. Sets color of the LED in <code>#rrggbb</code> or <code>#rrggbbaa</code> format. |
|  [lightOffDurationMillis](./firebase-admin_.lightsettings.md#lightsettingslightoffdurationmillis_property) | number | Required. Along with <code>light_on_duration</code>, defines the blink rate of LED flashes. |
|  [lightOnDurationMillis](./firebase-admin_.lightsettings.md#lightsettingslightondurationmillis_property) | number | Required. Along with <code>light_off_duration</code>, defines the blink rate of LED flashes. |

## LightSettings.color property

Required. Sets color of the LED in `#rrggbb` or `#rrggbbaa` format.

<b>Signature:</b>

```typescript
color: string;
```

## LightSettings.lightOffDurationMillis property

Required. Along with `light_on_duration`<!-- -->, defines the blink rate of LED flashes.

<b>Signature:</b>

```typescript
lightOffDurationMillis: number;
```

## LightSettings.lightOnDurationMillis property

Required. Along with `light_off_duration`<!-- -->, defines the blink rate of LED flashes.

<b>Signature:</b>

```typescript
lightOnDurationMillis: number;
```
{% endblock body %}
