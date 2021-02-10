{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Aps interface

Represents the \[aps dictionary\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages.

<b>Signature:</b>

```typescript
export interface Aps 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [alert](./firebase-admin_.aps.md#apsalert_property) | string \| [ApsAlert](./firebase-admin_.apsalert.md#apsalert_interface) | Alert to be included in the message. This may be a string or an object of type <code>admin.messaging.ApsAlert</code>. |
|  [badge](./firebase-admin_.aps.md#apsbadge_property) | number | Badge to be displayed with the message. Set to 0 to remove the badge. When not specified, the badge will remain unchanged. |
|  [category](./firebase-admin_.aps.md#apscategory_property) | string | Type of the notification. |
|  [contentAvailable](./firebase-admin_.aps.md#apscontentavailable_property) | boolean | Specifies whether to configure a background update notification. |
|  [mutableContent](./firebase-admin_.aps.md#apsmutablecontent_property) | boolean | Specifies whether to set the <code>mutable-content</code> property on the message so the clients can modify the notification via app extensions. |
|  [sound](./firebase-admin_.aps.md#apssound_property) | string \| [CriticalSound](./firebase-admin_.criticalsound.md#criticalsound_interface) | Sound to be played with the message. |
|  [threadId](./firebase-admin_.aps.md#apsthreadid_property) | string | An app-specific identifier for grouping notifications. |

## Aps.alert property

Alert to be included in the message. This may be a string or an object of type `admin.messaging.ApsAlert`<!-- -->.

<b>Signature:</b>

```typescript
alert?: string | ApsAlert;
```

## Aps.badge property

Badge to be displayed with the message. Set to 0 to remove the badge. When not specified, the badge will remain unchanged.

<b>Signature:</b>

```typescript
badge?: number;
```

## Aps.category property

Type of the notification.

<b>Signature:</b>

```typescript
category?: string;
```

## Aps.contentAvailable property

Specifies whether to configure a background update notification.

<b>Signature:</b>

```typescript
contentAvailable?: boolean;
```

## Aps.mutableContent property

Specifies whether to set the `mutable-content` property on the message so the clients can modify the notification via app extensions.

<b>Signature:</b>

```typescript
mutableContent?: boolean;
```

## Aps.sound property

Sound to be played with the message.

<b>Signature:</b>

```typescript
sound?: string | CriticalSound;
```

## Aps.threadId property

An app-specific identifier for grouping notifications.

<b>Signature:</b>

```typescript
threadId?: string;
```
{% endblock body %}
