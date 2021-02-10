{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MessagingPayload interface

Interface representing a Firebase Cloud Messaging message payload. One or both of the `data` and `notification` keys are required.

See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingPayload 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [data](./firebase-admin_messaging.messagingpayload.md#messagingpayloaddata_property) | [DataMessagePayload](./firebase-admin_.datamessagepayload.md#datamessagepayload_interface) | The data message payload. |
|  [notification](./firebase-admin_messaging.messagingpayload.md#messagingpayloadnotification_property) | [NotificationMessagePayload](./firebase-admin_.notificationmessagepayload.md#notificationmessagepayload_interface) | The notification message payload. |

## MessagingPayload.data property

The data message payload.

<b>Signature:</b>

```typescript
data?: DataMessagePayload;
```

## MessagingPayload.notification property

The notification message payload.

<b>Signature:</b>

```typescript
notification?: NotificationMessagePayload;
```
{% endblock body %}
