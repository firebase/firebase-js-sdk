{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MulticastMessage interface

Payload for the admin.messaing.sendMulticast() method. The payload contains all the fields in the BaseMessage type, and a list of tokens.

<b>Signature:</b>

```typescript
export interface MulticastMessage extends BaseMessage 
```
<b>Extends:</b> [BaseMessage](./firebase-admin_.basemessage.md#basemessage_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [tokens](./firebase-admin_messaging.multicastmessage.md#multicastmessagetokens_property) | string\[\] |  |

## MulticastMessage.tokens property

<b>Signature:</b>

```typescript
tokens: string[];
```
{% endblock body %}
