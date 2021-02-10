{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ApnsFcmOptions interface

Represents options for features provided by the FCM SDK for iOS.

<b>Signature:</b>

```typescript
export interface ApnsFcmOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [analyticsLabel](./firebase-admin_.apnsfcmoptions.md#apnsfcmoptionsanalyticslabel_property) | string | The label associated with the message's analytics data. |
|  [imageUrl](./firebase-admin_.apnsfcmoptions.md#apnsfcmoptionsimageurl_property) | string | URL of an image to be displayed in the notification. |

## ApnsFcmOptions.analyticsLabel property

The label associated with the message's analytics data.

<b>Signature:</b>

```typescript
analyticsLabel?: string;
```

## ApnsFcmOptions.imageUrl property

URL of an image to be displayed in the notification.

<b>Signature:</b>

```typescript
imageUrl?: string;
```
{% endblock body %}
