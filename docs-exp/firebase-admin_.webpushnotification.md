{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## WebpushNotification interface

Represents the WebPush-specific notification options that can be included in . This supports most of the standard options as defined in the Web Notification \[specification\](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification).

<b>Signature:</b>

```typescript
export interface WebpushNotification 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [actions](./firebase-admin_.webpushnotification.md#webpushnotificationactions_property) | Array&lt;{ action: string; icon?: string; title: string; }&gt; | An array of notification actions representing the actions available to the user when the notification is presented. |
|  [badge](./firebase-admin_.webpushnotification.md#webpushnotificationbadge_property) | string | URL of the image used to represent the notification when there is not enough space to display the notification itself. |
|  [body](./firebase-admin_.webpushnotification.md#webpushnotificationbody_property) | string | Body text of the notification. |
|  [data](./firebase-admin_.webpushnotification.md#webpushnotificationdata_property) | any | Arbitrary data that you want associated with the notification. This can be of any data type. |
|  [dir](./firebase-admin_.webpushnotification.md#webpushnotificationdir_property) | 'auto' \| 'ltr' \| 'rtl' | The direction in which to display the notification. Must be one of <code>auto</code>, <code>ltr</code> or <code>rtl</code>. |
|  [icon](./firebase-admin_.webpushnotification.md#webpushnotificationicon_property) | string | URL to the notification icon. |
|  [image](./firebase-admin_.webpushnotification.md#webpushnotificationimage_property) | string | URL of an image to be displayed in the notification. |
|  [lang](./firebase-admin_.webpushnotification.md#webpushnotificationlang_property) | string | The notification's language as a BCP 47 language tag. |
|  [renotify](./firebase-admin_.webpushnotification.md#webpushnotificationrenotify_property) | boolean | A boolean specifying whether the user should be notified after a new notification replaces an old one. Defaults to false. |
|  [requireInteraction](./firebase-admin_.webpushnotification.md#webpushnotificationrequireinteraction_property) | boolean | Indicates that a notification should remain active until the user clicks or dismisses it, rather than closing automatically. Defaults to false. |
|  [silent](./firebase-admin_.webpushnotification.md#webpushnotificationsilent_property) | boolean | A boolean specifying whether the notification should be silent. Defaults to false. |
|  [tag](./firebase-admin_.webpushnotification.md#webpushnotificationtag_property) | string | An identifying tag for the notification. |
|  [timestamp](./firebase-admin_.webpushnotification.md#webpushnotificationtimestamp_property) | number | Timestamp of the notification. Refer to https://developer.mozilla.org/en-US/docs/Web/API/notification/timestamp for details. |
|  [title](./firebase-admin_.webpushnotification.md#webpushnotificationtitle_property) | string | Title text of the notification. |
|  [vibrate](./firebase-admin_.webpushnotification.md#webpushnotificationvibrate_property) | number \| number\[\] | A vibration pattern for the device's vibration hardware to emit when the notification fires. |

## WebpushNotification.actions property

An array of notification actions representing the actions available to the user when the notification is presented.

<b>Signature:</b>

```typescript
actions?: Array<{
        action: string;
        icon?: string;
        title: string;
    }>;
```

## WebpushNotification.badge property

URL of the image used to represent the notification when there is not enough space to display the notification itself.

<b>Signature:</b>

```typescript
badge?: string;
```

## WebpushNotification.body property

Body text of the notification.

<b>Signature:</b>

```typescript
body?: string;
```

## WebpushNotification.data property

Arbitrary data that you want associated with the notification. This can be of any data type.

<b>Signature:</b>

```typescript
data?: any;
```

## WebpushNotification.dir property

The direction in which to display the notification. Must be one of `auto`<!-- -->, `ltr` or `rtl`<!-- -->.

<b>Signature:</b>

```typescript
dir?: 'auto' | 'ltr' | 'rtl';
```

## WebpushNotification.icon property

URL to the notification icon.

<b>Signature:</b>

```typescript
icon?: string;
```

## WebpushNotification.image property

URL of an image to be displayed in the notification.

<b>Signature:</b>

```typescript
image?: string;
```

## WebpushNotification.lang property

The notification's language as a BCP 47 language tag.

<b>Signature:</b>

```typescript
lang?: string;
```

## WebpushNotification.renotify property

A boolean specifying whether the user should be notified after a new notification replaces an old one. Defaults to false.

<b>Signature:</b>

```typescript
renotify?: boolean;
```

## WebpushNotification.requireInteraction property

Indicates that a notification should remain active until the user clicks or dismisses it, rather than closing automatically. Defaults to false.

<b>Signature:</b>

```typescript
requireInteraction?: boolean;
```

## WebpushNotification.silent property

A boolean specifying whether the notification should be silent. Defaults to false.

<b>Signature:</b>

```typescript
silent?: boolean;
```

## WebpushNotification.tag property

An identifying tag for the notification.

<b>Signature:</b>

```typescript
tag?: string;
```

## WebpushNotification.timestamp property

Timestamp of the notification. Refer to https://developer.mozilla.org/en-US/docs/Web/API/notification/timestamp for details.

<b>Signature:</b>

```typescript
timestamp?: number;
```

## WebpushNotification.title property

Title text of the notification.

<b>Signature:</b>

```typescript
title?: string;
```

## WebpushNotification.vibrate property

A vibration pattern for the device's vibration hardware to emit when the notification fires.

<b>Signature:</b>

```typescript
vibrate?: number | number[];
```
{% endblock body %}
