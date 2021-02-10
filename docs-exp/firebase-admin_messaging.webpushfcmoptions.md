{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## WebpushFcmOptions interface

Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard).

<b>Signature:</b>

```typescript
export interface WebpushFcmOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [link](./firebase-admin_messaging.webpushfcmoptions.md#webpushfcmoptionslink_property) | string | The link to open when the user clicks on the notification. For all URL values, HTTPS is required. |

## WebpushFcmOptions.link property

The link to open when the user clicks on the notification. For all URL values, HTTPS is required.

<b>Signature:</b>

```typescript
link?: string;
```
{% endblock body %}
