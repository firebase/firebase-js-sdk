{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MessagingDeviceGroupResponse interface

Interface representing the server response from the  method.

See \[Send messages to device groups\](/docs/cloud-messaging/send-message?authuser=0\#send\_messages\_to\_device\_groups) for code samples and detailed documentation.

<b>Signature:</b>

```typescript
export interface MessagingDeviceGroupResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [failedRegistrationTokens](./firebase-admin_messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsefailedregistrationtokens_property) | string\[\] | An array of registration tokens that failed to receive the message. |
|  [failureCount](./firebase-admin_messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsefailurecount_property) | number | The number of messages that could not be processed and resulted in an error. |
|  [successCount](./firebase-admin_messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponsesuccesscount_property) | number | The number of messages that could not be processed and resulted in an error. |

## MessagingDeviceGroupResponse.failedRegistrationTokens property

An array of registration tokens that failed to receive the message.

<b>Signature:</b>

```typescript
failedRegistrationTokens: string[];
```

## MessagingDeviceGroupResponse.failureCount property

The number of messages that could not be processed and resulted in an error.

<b>Signature:</b>

```typescript
failureCount: number;
```

## MessagingDeviceGroupResponse.successCount property

The number of messages that could not be processed and resulted in an error.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}
