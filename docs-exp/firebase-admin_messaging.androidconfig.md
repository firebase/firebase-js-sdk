{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AndroidConfig interface

Represents the Android-specific options that can be included in an .

<b>Signature:</b>

```typescript
export interface AndroidConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [collapseKey](./firebase-admin_messaging.androidconfig.md#androidconfigcollapsekey_property) | string | Collapse key for the message. Collapse key serves as an identifier for a group of messages that can be collapsed, so that only the last message gets sent when delivery can be resumed. A maximum of four different collapse keys may be active at any given time. |
|  [data](./firebase-admin_messaging.androidconfig.md#androidconfigdata_property) | { \[key: string\]: string; } | A collection of data fields to be included in the message. All values must be strings. When provided, overrides any data fields set on the top-level <code>admin.messaging.Message</code>.<!-- -->} |
|  [fcmOptions](./firebase-admin_messaging.androidconfig.md#androidconfigfcmoptions_property) | [AndroidFcmOptions](./firebase-admin_.androidfcmoptions.md#androidfcmoptions_interface) | Options for features provided by the FCM SDK for Android. |
|  [notification](./firebase-admin_messaging.androidconfig.md#androidconfignotification_property) | [AndroidNotification](./firebase-admin_.androidnotification.md#androidnotification_interface) | Android notification to be included in the message. |
|  [priority](./firebase-admin_messaging.androidconfig.md#androidconfigpriority_property) | ('high' \| 'normal') | Priority of the message. Must be either <code>normal</code> or <code>high</code>. |
|  [restrictedPackageName](./firebase-admin_messaging.androidconfig.md#androidconfigrestrictedpackagename_property) | string | Package name of the application where the registration tokens must match in order to receive the message. |
|  [ttl](./firebase-admin_messaging.androidconfig.md#androidconfigttl_property) | number | Time-to-live duration of the message in milliseconds. |

## AndroidConfig.collapseKey property

Collapse key for the message. Collapse key serves as an identifier for a group of messages that can be collapsed, so that only the last message gets sent when delivery can be resumed. A maximum of four different collapse keys may be active at any given time.

<b>Signature:</b>

```typescript
collapseKey?: string;
```

## AndroidConfig.data property

A collection of data fields to be included in the message. All values must be strings. When provided, overrides any data fields set on the top-level `admin.messaging.Message`<!-- -->.<!-- -->}

<b>Signature:</b>

```typescript
data?: {
        [key: string]: string;
    };
```

## AndroidConfig.fcmOptions property

Options for features provided by the FCM SDK for Android.

<b>Signature:</b>

```typescript
fcmOptions?: AndroidFcmOptions;
```

## AndroidConfig.notification property

Android notification to be included in the message.

<b>Signature:</b>

```typescript
notification?: AndroidNotification;
```

## AndroidConfig.priority property

Priority of the message. Must be either `normal` or `high`<!-- -->.

<b>Signature:</b>

```typescript
priority?: ('high' | 'normal');
```

## AndroidConfig.restrictedPackageName property

Package name of the application where the registration tokens must match in order to receive the message.

<b>Signature:</b>

```typescript
restrictedPackageName?: string;
```

## AndroidConfig.ttl property

Time-to-live duration of the message in milliseconds.

<b>Signature:</b>

```typescript
ttl?: number;
```
{% endblock body %}
