{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MessagingDeviceResult interface

<b>Signature:</b>

```typescript
export interface MessagingDeviceResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [canonicalRegistrationToken](./firebase-admin_.messagingdeviceresult.md#messagingdeviceresultcanonicalregistrationtoken_property) | string | The canonical registration token for the client app that the message was processed and sent to. You should use this value as the registration token for future requests. Otherwise, future messages might be rejected. |
|  [error](./firebase-admin_.messagingdeviceresult.md#messagingdeviceresulterror_property) | [FirebaseError](./firebase-admin_.firebaseerror.md#firebaseerror_interface) | The error that occurred when processing the message for the recipient. |
|  [messageId](./firebase-admin_.messagingdeviceresult.md#messagingdeviceresultmessageid_property) | string | A unique ID for the successfully processed message. |

## MessagingDeviceResult.canonicalRegistrationToken property

The canonical registration token for the client app that the message was processed and sent to. You should use this value as the registration token for future requests. Otherwise, future messages might be rejected.

<b>Signature:</b>

```typescript
canonicalRegistrationToken?: string;
```

## MessagingDeviceResult.error property

The error that occurred when processing the message for the recipient.

<b>Signature:</b>

```typescript
error?: FirebaseError;
```

## MessagingDeviceResult.messageId property

A unique ID for the successfully processed message.

<b>Signature:</b>

```typescript
messageId?: string;
```
{% endblock body %}
