{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ApnsPayload interface

Represents the payload of an APNs message. Mainly consists of the `aps` dictionary. But may also contain other arbitrary custom keys.

<b>Signature:</b>

```typescript
export interface ApnsPayload 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [aps](./firebase-admin_messaging.apnspayload.md#apnspayloadaps_property) | [Aps](./firebase-admin_.aps.md#aps_interface) | The <code>aps</code> dictionary to be included in the message. |

## ApnsPayload.aps property

The `aps` dictionary to be included in the message.

<b>Signature:</b>

```typescript
aps: Aps;
```
{% endblock body %}
