{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ApnsConfig interface

Represents the APNs-specific options that can be included in an . Refer to \[Apple documentation\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs.

<b>Signature:</b>

```typescript
export interface ApnsConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [fcmOptions](./firebase-admin_.apnsconfig.md#apnsconfigfcmoptions_property) | [ApnsFcmOptions](./firebase-admin_.apnsfcmoptions.md#apnsfcmoptions_interface) | Options for features provided by the FCM SDK for iOS. |
|  [headers](./firebase-admin_.apnsconfig.md#apnsconfigheaders_property) | { \[key: string\]: string; } | A collection of APNs headers. Header values must be strings. |
|  [payload](./firebase-admin_.apnsconfig.md#apnsconfigpayload_property) | [ApnsPayload](./firebase-admin_.apnspayload.md#apnspayload_interface) | An APNs payload to be included in the message. |

## ApnsConfig.fcmOptions property

Options for features provided by the FCM SDK for iOS.

<b>Signature:</b>

```typescript
fcmOptions?: ApnsFcmOptions;
```

## ApnsConfig.headers property

A collection of APNs headers. Header values must be strings.

<b>Signature:</b>

```typescript
headers?: {
        [key: string]: string;
    };
```

## ApnsConfig.payload property

An APNs payload to be included in the message.

<b>Signature:</b>

```typescript
payload?: ApnsPayload;
```
{% endblock body %}
