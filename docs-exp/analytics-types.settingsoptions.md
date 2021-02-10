{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## SettingsOptions interface

Specifies custom options for your Firebase Analytics instance. You must set these before initializing `firebase.analytics()`<!-- -->.

<b>Signature:</b>

```typescript
export interface SettingsOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [dataLayerName](./analytics-types.settingsoptions.md#settingsoptionsdatalayername_property) | string | Sets custom name for <code>dataLayer</code> array used by gtag. |
|  [gtagName](./analytics-types.settingsoptions.md#settingsoptionsgtagname_property) | string | Sets custom name for <code>gtag</code> function. |

## SettingsOptions.dataLayerName property

Sets custom name for `dataLayer` array used by gtag.

<b>Signature:</b>

```typescript
dataLayerName?: string;
```

## SettingsOptions.gtagName property

Sets custom name for `gtag` function.

<b>Signature:</b>

```typescript
gtagName?: string;
```
{% endblock body %}
