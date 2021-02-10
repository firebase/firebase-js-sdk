{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## Settings interface

Defines configuration options for the Remote Config SDK.

<b>Signature:</b>

```typescript
export interface Settings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [fetchTimeoutMillis](./remote-config-types.settings.md#settingsfetchtimeoutmillis_property) | number | Defines the maximum amount of milliseconds to wait for a response when fetching configuration from the Remote Config server. Defaults to 60000 (One minute). |
|  [minimumFetchIntervalMillis](./remote-config-types.settings.md#settingsminimumfetchintervalmillis_property) | number | Defines the maximum age in milliseconds of an entry in the config cache before it is considered stale. Defaults to 43200000 (Twelve hours). |

## Settings.fetchTimeoutMillis property

Defines the maximum amount of milliseconds to wait for a response when fetching configuration from the Remote Config server. Defaults to 60000 (One minute).

<b>Signature:</b>

```typescript
fetchTimeoutMillis: number;
```

## Settings.minimumFetchIntervalMillis property

Defines the maximum age in milliseconds of an entry in the config cache before it is considered stale. Defaults to 43200000 (Twelve hours).

<b>Signature:</b>

```typescript
minimumFetchIntervalMillis: number;
```
{% endblock body %}
