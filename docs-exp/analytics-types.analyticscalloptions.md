{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## AnalyticsCallOptions interface

Additional options that can be passed to Firebase Analytics method calls such as `logEvent`<!-- -->, `setCurrentScreen`<!-- -->, etc.

<b>Signature:</b>

```typescript
export interface AnalyticsCallOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [global](./analytics-types.analyticscalloptions.md#analyticscalloptionsglobal_property) | boolean | If true, this config or event call applies globally to all analytics properties on the page. |

## AnalyticsCallOptions.global property

If true, this config or event call applies globally to all analytics properties on the page.

<b>Signature:</b>

```typescript
global: boolean;
```
{% endblock body %}
