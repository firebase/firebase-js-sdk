{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## BatchResponse interface

Interface representing the server response from the  and  methods.

<b>Signature:</b>

```typescript
export interface BatchResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [failureCount](./firebase-admin_.batchresponse.md#batchresponsefailurecount_property) | number | The number of messages that resulted in errors when sending. |
|  [responses](./firebase-admin_.batchresponse.md#batchresponseresponses_property) | [SendResponse](./firebase-admin_.sendresponse.md#sendresponse_interface)<!-- -->\[\] | An array of responses, each corresponding to a message. |
|  [successCount](./firebase-admin_.batchresponse.md#batchresponsesuccesscount_property) | number | The number of messages that were successfully handed off for sending. |

## BatchResponse.failureCount property

The number of messages that resulted in errors when sending.

<b>Signature:</b>

```typescript
failureCount: number;
```

## BatchResponse.responses property

An array of responses, each corresponding to a message.

<b>Signature:</b>

```typescript
responses: SendResponse[];
```

## BatchResponse.successCount property

The number of messages that were successfully handed off for sending.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}
