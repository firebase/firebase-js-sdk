{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## WebpushConfig interface

Represents the WebPush protocol options that can be included in an .

<b>Signature:</b>

```typescript
export interface WebpushConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [data](./firebase-admin_.webpushconfig.md#webpushconfigdata_property) | { \[key: string\]: string; } | A collection of data fields. |
|  [fcmOptions](./firebase-admin_.webpushconfig.md#webpushconfigfcmoptions_property) | [WebpushFcmOptions](./firebase-admin_.webpushfcmoptions.md#webpushfcmoptions_interface) | Options for features provided by the FCM SDK for Web. |
|  [headers](./firebase-admin_.webpushconfig.md#webpushconfigheaders_property) | { \[key: string\]: string; } | A collection of WebPush headers. Header values must be strings.<!-- -->See \[WebPush specification\](https://tools.ietf.org/html/rfc8030\#section-5) for supported headers. |
|  [notification](./firebase-admin_.webpushconfig.md#webpushconfignotification_property) | [WebpushNotification](./firebase-admin_.webpushnotification.md#webpushnotification_interface) | A WebPush notification payload to be included in the message. |

## WebpushConfig.data property

A collection of data fields.

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## WebpushConfig.fcmOptions property

Options for features provided by the FCM SDK for Web.

<b>Signature:</b>

```typescript
fcmOptions?: WebpushFcmOptions;
```

## WebpushConfig.headers property

A collection of WebPush headers. Header values must be strings.

See \[WebPush specification\](https://tools.ietf.org/html/rfc8030\#section-5) for supported headers.

<b>Signature:</b>

```typescript
headers?: {
        [key: string]: string;
    };
```

## WebpushConfig.notification property

A WebPush notification payload to be included in the message.

<b>Signature:</b>

```typescript
notification?: WebpushNotification;
```
{% endblock body %}
