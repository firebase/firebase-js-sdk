{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## firebase-admin/messaging

## Classes

|  Class | Description |
|  --- | --- |
|  [Messaging](./firebase-admin_messaging.messaging.md#messaging_class) | Messaging service bound to the provided app. |

## Functions

|  Function | Description |
|  --- | --- |
|  [getMessaging(app)](./firebase-admin_messaging.md#getmessaging_function) |  |
|  [messaging(app)](./firebase-admin_messaging.md#messaging_function) | Gets the  service for the default app or a given app.<code>admin.messaging()</code> can be called with no arguments to access the default app's  service or as <code>admin.messaging(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [AndroidConfig](./firebase-admin_messaging.androidconfig.md#androidconfig_interface) | Represents the Android-specific options that can be included in an . |
|  [AndroidFcmOptions](./firebase-admin_messaging.androidfcmoptions.md#androidfcmoptions_interface) | Represents options for features provided by the FCM SDK for Android. |
|  [AndroidNotification](./firebase-admin_messaging.androidnotification.md#androidnotification_interface) | Represents the Android-specific notification options that can be included in . |
|  [ApnsConfig](./firebase-admin_messaging.apnsconfig.md#apnsconfig_interface) | Represents the APNs-specific options that can be included in an . Refer to \[Apple documentation\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs. |
|  [ApnsFcmOptions](./firebase-admin_messaging.apnsfcmoptions.md#apnsfcmoptions_interface) | Represents options for features provided by the FCM SDK for iOS. |
|  [ApnsPayload](./firebase-admin_messaging.apnspayload.md#apnspayload_interface) | Represents the payload of an APNs message. Mainly consists of the <code>aps</code> dictionary. But may also contain other arbitrary custom keys. |
|  [App](./firebase-admin_messaging.app.md#app_interface) |  |
|  [AppOptions](./firebase-admin_messaging.appoptions.md#appoptions_interface) | Available options to pass to \[<code>initializeApp()</code>\](admin\#.initializeApp). |
|  [Aps](./firebase-admin_messaging.aps.md#aps_interface) | Represents the \[aps dictionary\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages. |
|  [ApsAlert](./firebase-admin_messaging.apsalert.md#apsalert_interface) |  |
|  [BaseMessage](./firebase-admin_messaging.basemessage.md#basemessage_interface) |  |
|  [BatchResponse](./firebase-admin_messaging.batchresponse.md#batchresponse_interface) | Interface representing the server response from the  and  methods. |
|  [ConditionMessage](./firebase-admin_messaging.conditionmessage.md#conditionmessage_interface) |  |
|  [Credential](./firebase-admin_messaging.credential.md#credential_interface) |  |
|  [CriticalSound](./firebase-admin_messaging.criticalsound.md#criticalsound_interface) | Represents a critical sound configuration that can be included in the <code>aps</code> dictionary of an APNs payload. |
|  [DataMessagePayload](./firebase-admin_messaging.datamessagepayload.md#datamessagepayload_interface) | Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:<!-- -->\* <code>&quot;from&quot;</code> \* Anything starting with <code>&quot;google.&quot;</code>.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [FcmOptions](./firebase-admin_messaging.fcmoptions.md#fcmoptions_interface) | Represents platform-independent options for features provided by the FCM SDKs. |
|  [FirebaseArrayIndexError](./firebase-admin_messaging.firebasearrayindexerror.md#firebasearrayindexerror_interface) | Composite type which includes both a <code>FirebaseError</code> object and an index which can be used to get the errored item. |
|  [FirebaseError](./firebase-admin_messaging.firebaseerror.md#firebaseerror_interface) | <code>FirebaseError</code> is a subclass of the standard JavaScript <code>Error</code> object. In addition to a message string and stack trace, it contains a string code. |
|  [GoogleOAuthAccessToken](./firebase-admin_messaging.googleoauthaccesstoken.md#googleoauthaccesstoken_interface) | Interface for Google OAuth 2.0 access tokens. |
|  [LightSettings](./firebase-admin_messaging.lightsettings.md#lightsettings_interface) | Represents settings to control notification LED that can be included in . |
|  [MessagingConditionResponse](./firebase-admin_messaging.messagingconditionresponse.md#messagingconditionresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a condition\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_condition) for code samples and detailed documentation. |
|  [MessagingDeviceGroupResponse](./firebase-admin_messaging.messagingdevicegroupresponse.md#messagingdevicegroupresponse_interface) | Interface representing the server response from the  method.<!-- -->See \[Send messages to device groups\](/docs/cloud-messaging/send-message?authuser=0\#send\_messages\_to\_device\_groups) for code samples and detailed documentation. |
|  [MessagingDeviceResult](./firebase-admin_messaging.messagingdeviceresult.md#messagingdeviceresult_interface) |  |
|  [MessagingDevicesResponse](./firebase-admin_messaging.messagingdevicesresponse.md#messagingdevicesresponse_interface) | Interface representing the status of a message sent to an individual device via the FCM legacy APIs.<!-- -->See \[Send to individual devices\](/docs/cloud-messaging/admin/send-messages\#send\_to\_individual\_devices) for code samples and detailed documentation. |
|  [MessagingOptions](./firebase-admin_messaging.messagingoptions.md#messagingoptions_interface) | Interface representing the options that can be provided when sending a message via the FCM legacy APIs.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingPayload](./firebase-admin_messaging.messagingpayload.md#messagingpayload_interface) | Interface representing a Firebase Cloud Messaging message payload. One or both of the <code>data</code> and <code>notification</code> keys are required.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingTopicManagementResponse](./firebase-admin_messaging.messagingtopicmanagementresponse.md#messagingtopicmanagementresponse_interface) | Interface representing the server response from the  and  methods.<!-- -->See \[Manage topics from the server\](/docs/cloud-messaging/manage-topics) for code samples and detailed documentation. |
|  [MessagingTopicResponse](./firebase-admin_messaging.messagingtopicresponse.md#messagingtopicresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a topic\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_topic) for code samples and detailed documentation. |
|  [MulticastMessage](./firebase-admin_messaging.multicastmessage.md#multicastmessage_interface) | Payload for the admin.messaing.sendMulticast() method. The payload contains all the fields in the BaseMessage type, and a list of tokens. |
|  [Notification](./firebase-admin_messaging.notification.md#notification_interface) | A notification that can be included in . |
|  [NotificationMessagePayload](./firebase-admin_messaging.notificationmessagepayload.md#notificationmessagepayload_interface) | Interface representing an FCM legacy API notification message payload. Notification messages let developers send up to 4KB of predefined key-value pairs. Accepted keys are outlined below.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [SendResponse](./firebase-admin_messaging.sendresponse.md#sendresponse_interface) | Interface representing the status of an individual message that was sent as part of a batch request. |
|  [TokenMessage](./firebase-admin_messaging.tokenmessage.md#tokenmessage_interface) |  |
|  [TopicMessage](./firebase-admin_messaging.topicmessage.md#topicmessage_interface) |  |
|  [WebpushConfig](./firebase-admin_messaging.webpushconfig.md#webpushconfig_interface) | Represents the WebPush protocol options that can be included in an . |
|  [WebpushFcmOptions](./firebase-admin_messaging.webpushfcmoptions.md#webpushfcmoptions_interface) | Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard). |
|  [WebpushNotification](./firebase-admin_messaging.webpushnotification.md#webpushnotification_interface) | Represents the WebPush-specific notification options that can be included in . This supports most of the standard options as defined in the Web Notification \[specification\](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification). |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [messaging](./firebase-admin_messaging.md#messaging_namespace) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [Message](./firebase-admin_messaging.md#message_type) | Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition. |

## getMessaging() function

<b>Signature:</b>

```typescript
export declare function getMessaging(app?: App): Messaging;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[Messaging](./firebase-admin_.messaging.md#messaging_class)

## messaging() function

Gets the  service for the default app or a given app.

`admin.messaging()` can be called with no arguments to access the default app's  service or as `admin.messaging(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function messaging(app?: App): messaging.Messaging;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app whose <code>Messaging</code> service to return. If not provided, the default <code>Messaging</code> service will be returned. The default <code>Messaging</code> service if no app is provided or the <code>Messaging</code> service associated with the provided app. |

<b>Returns:</b>

[messaging.Messaging](./firebase-admin_messaging.md#messagingmessaging_type)

## Example 1


```javascript
// Get the Messaging service for the default app
var defaultMessaging = admin.messaging();

```

## Example 2


```javascript
// Get the Messaging service for a given app
var otherMessaging = admin.messaging(otherApp);

```

## Message type

Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition.

<b>Signature:</b>

```typescript
export declare type Message = TokenMessage | TopicMessage | ConditionMessage;
```
{% endblock body %}
