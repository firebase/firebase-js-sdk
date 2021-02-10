{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MessagingDevicesResponse interface

Interface representing the status of a message sent to an individual device via the FCM legacy APIs.

See \[Send to individual devices\](/docs/cloud-messaging/admin/send-messages\#send\_to\_individual\_devices) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingDevicesResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [canonicalRegistrationTokenCount](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponsecanonicalregistrationtokencount_property) | number |  |
|  [failureCount](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponsefailurecount_property) | number |  |
|  [multicastId](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponsemulticastid_property) | number |  |
|  [results](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponseresults_property) | [MessagingDeviceResult](./firebase-admin_.messagingdeviceresult.md#messagingdeviceresult_interface)<!-- -->\[\] |  |
|  [successCount](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponsesuccesscount_property) | number |  |

## MessagingDevicesResponse.canonicalRegistrationTokenCount property

<b>Signature:</b>

```typescript
canonicalRegistrationTokenCount: number;
```

## MessagingDevicesResponse.failureCount property

<b>Signature:</b>

```typescript
failureCount: number;
```

## MessagingDevicesResponse.multicastId property

<b>Signature:</b>

```typescript
multicastId: number;
```

## MessagingDevicesResponse.results property

<b>Signature:</b>

```typescript
results: MessagingDeviceResult[];
```

## MessagingDevicesResponse.successCount property

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}
