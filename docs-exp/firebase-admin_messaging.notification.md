{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Notification interface

A notification that can be included in .

<b>Signature:</b>

```typescript
export interface Notification 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [body](./firebase-admin_messaging.notification.md#notificationbody_property) | string | The notification body |
|  [imageUrl](./firebase-admin_messaging.notification.md#notificationimageurl_property) | string | URL of an image to be displayed in the notification. |
|  [title](./firebase-admin_messaging.notification.md#notificationtitle_property) | string | The title of the notification. |

## Notification.body property

The notification body

<b>Signature:</b>

```typescript
body?: string;
```

## Notification.imageUrl property

URL of an image to be displayed in the notification.

<b>Signature:</b>

```typescript
imageUrl?: string;
```

## Notification.title property

The title of the notification.

<b>Signature:</b>

```typescript
title?: string;
```
{% endblock body %}
