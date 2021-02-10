{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## BaseMessage interface

<b>Signature:</b>

```typescript
export interface BaseMessage 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [android](./firebase-admin_messaging.basemessage.md#basemessageandroid_property) | [AndroidConfig](./firebase-admin_.androidconfig.md#androidconfig_interface) |  |
|  [apns](./firebase-admin_messaging.basemessage.md#basemessageapns_property) | [ApnsConfig](./firebase-admin_.apnsconfig.md#apnsconfig_interface) |  |
|  [data](./firebase-admin_messaging.basemessage.md#basemessagedata_property) | { \[key: string\]: string; } |  |
|  [fcmOptions](./firebase-admin_messaging.basemessage.md#basemessagefcmoptions_property) | [FcmOptions](./firebase-admin_.fcmoptions.md#fcmoptions_interface) |  |
|  [notification](./firebase-admin_messaging.basemessage.md#basemessagenotification_property) | [Notification](./firebase-admin_.notification.md#notification_interface) |  |
|  [webpush](./firebase-admin_messaging.basemessage.md#basemessagewebpush_property) | [WebpushConfig](./firebase-admin_.webpushconfig.md#webpushconfig_interface) |  |

## BaseMessage.android property

<b>Signature:</b>

```typescript
android?: AndroidConfig;
```

## BaseMessage.apns property

<b>Signature:</b>

```typescript
apns?: ApnsConfig;
```

## BaseMessage.data property

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## BaseMessage.fcmOptions property

<b>Signature:</b>

```typescript
fcmOptions?: FcmOptions;
```

## BaseMessage.notification property

<b>Signature:</b>

```typescript
notification?: Notification;
```

## BaseMessage.webpush property

<b>Signature:</b>

```typescript
webpush?: WebpushConfig;
```
{% endblock body %}
