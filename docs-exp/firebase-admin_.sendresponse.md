{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## SendResponse interface

Interface representing the status of an individual message that was sent as part of a batch request.

<b>Signature:</b>

```typescript
export interface SendResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [error](./firebase-admin_.sendresponse.md#sendresponseerror_property) | [FirebaseError](./firebase-admin_.firebaseerror.md#firebaseerror_interface) | An error, if the message was not handed off to FCM successfully. |
|  [messageId](./firebase-admin_.sendresponse.md#sendresponsemessageid_property) | string | A unique message ID string, if the message was handed off to FCM for delivery. |
|  [success](./firebase-admin_.sendresponse.md#sendresponsesuccess_property) | boolean | A boolean indicating if the message was successfully handed off to FCM or not. When true, the <code>messageId</code> attribute is guaranteed to be set. When false, the <code>error</code> attribute is guaranteed to be set. |

## SendResponse.error property

An error, if the message was not handed off to FCM successfully.

<b>Signature:</b>

```typescript
error?: FirebaseError;
```

## SendResponse.messageId property

A unique message ID string, if the message was handed off to FCM for delivery.

<b>Signature:</b>

```typescript
messageId?: string;
```

## SendResponse.success property

A boolean indicating if the message was successfully handed off to FCM or not. When true, the `messageId` attribute is guaranteed to be set. When false, the `error` attribute is guaranteed to be set.

<b>Signature:</b>

```typescript
success: boolean;
```
{% endblock body %}
