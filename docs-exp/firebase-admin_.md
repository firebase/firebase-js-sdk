{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## firebase-admin

## Classes

|  Class | Description |
|  --- | --- |
|  [Auth](./firebase-admin_.auth.md#auth_class) | Auth service bound to the provided app. An Auth instance can have multiple tenants. |
|  [BaseAuth](./firebase-admin_.baseauth.md#baseauth_class) | Base Auth class. Mainly used for user management APIs. |
|  [Messaging](./firebase-admin_.messaging.md#messaging_class) | Messaging service bound to the provided app. |
|  [MultiFactorInfo](./firebase-admin_.multifactorinfo.md#multifactorinfo_class) | Abstract class representing a multi-factor info interface. |
|  [MultiFactorSettings](./firebase-admin_.multifactorsettings.md#multifactorsettings_class) | Class representing multi-factor related properties of a user. |
|  [PhoneMultiFactorInfo](./firebase-admin_.phonemultifactorinfo.md#phonemultifactorinfo_class) | Class representing a phone MultiFactorInfo object. |
|  [Tenant](./firebase-admin_.tenant.md#tenant_class) | Tenant class that defines a Firebase Auth tenant. |
|  [TenantAwareAuth](./firebase-admin_.tenantawareauth.md#tenantawareauth_class) | The tenant aware Auth class. |
|  [TenantManager](./firebase-admin_.tenantmanager.md#tenantmanager_class) | Data structure used to help manage tenant related operations. This includes: - The ability to create, update, list, get and delete tenants for the underlying project. - Getting a TenantAwareAuth instance for running Auth related operations (user mgmt, provider config mgmt, etc) in the context of a specified tenant. |
|  [UserInfo](./firebase-admin_.userinfo.md#userinfo_class) | User info class that provides provider user information for different Firebase providers like google.com, facebook.com, password, etc. |
|  [UserMetadata](./firebase-admin_.usermetadata.md#usermetadata_class) | User metadata class that provides metadata information like user account creation and last sign in time. |
|  [UserRecord](./firebase-admin_.userrecord.md#userrecord_class) | User record class that defines the Firebase user object populated from the Firebase Auth getAccountInfo response. |

## Functions

|  Function | Description |
|  --- | --- |
|  [app(name)](./firebase-admin_.md#app_function) |  |
|  [applicationDefault(httpAgent)](./firebase-admin_.md#applicationdefault_function) |  |
|  [auth(app)](./firebase-admin_.md#auth_function) | Gets the  service for the default app or a given app.<code>admin.auth()</code> can be called with no arguments to access the default app's  service or as <code>admin.auth(app)</code> to access the  service associated with a specific app. |
|  [cert(serviceAccountPathOrObject, httpAgent)](./firebase-admin_.md#cert_function) |  |
|  [database(app)](./firebase-admin_.md#database_function) | Gets the  service for the default app or a given app.<code>admin.database()</code> can be called with no arguments to access the default app's  service or as <code>admin.database(app)</code> to access the  service associated with a specific app.<code>admin.database</code> is also a namespace that can be used to access global constants and methods associated with the <code>Database</code> service. |
|  [deleteApp(app)](./firebase-admin_.md#deleteapp_function) |  |
|  [firestore(app)](./firebase-admin_.md#firestore_function) |  |
|  [getApp(name)](./firebase-admin_.md#getapp_function) |  |
|  [getApps()](./firebase-admin_.md#getapps_function) |  |
|  [initializeApp(options, name)](./firebase-admin_.md#initializeapp_function) |  |
|  [instanceId(app)](./firebase-admin_.md#instanceid_function) | Gets the  service for the default app or a given app.<code>admin.instanceId()</code> can be called with no arguments to access the default app's  service or as <code>admin.instanceId(app)</code> to access the  service associated with a specific app. |
|  [machineLearning(app)](./firebase-admin_.md#machinelearning_function) | Gets the  service for the default app or a given app.<code>admin.machineLearning()</code> can be called with no arguments to access the default app's  service or as <code>admin.machineLearning(app)</code> to access the  service associated with a specific app. |
|  [messaging(app)](./firebase-admin_.md#messaging_function) | Gets the  service for the default app or a given app.<code>admin.messaging()</code> can be called with no arguments to access the default app's  service or as <code>admin.messaging(app)</code> to access the  service associated with a specific app. |
|  [projectManagement(app)](./firebase-admin_.md#projectmanagement_function) | Gets the  service for the default app or a given app.<code>admin.projectManagement()</code> can be called with no arguments to access the default app's  service, or as <code>admin.projectManagement(app)</code> to access the  service associated with a specific app. |
|  [refreshToken(refreshTokenPathOrObject, httpAgent)](./firebase-admin_.md#refreshtoken_function) |  |
|  [remoteConfig(app)](./firebase-admin_.md#remoteconfig_function) | Gets the  service for the default app or a given app.<code>admin.remoteConfig()</code> can be called with no arguments to access the default app's  service or as <code>admin.remoteConfig(app)</code> to access the  service associated with a specific app. |
|  [securityRules(app)](./firebase-admin_.md#securityrules_function) | Gets the  service for the default app or a given app.<code>admin.securityRules()</code> can be called with no arguments to access the default app's  service, or as <code>admin.securityRules(app)</code> to access the  service associated with a specific app. |
|  [storage(app)](./firebase-admin_.md#storage_function) | Gets the  service for the default app or a given app.<code>admin.storage()</code> can be called with no arguments to access the default app's  service or as <code>admin.storage(app)</code> to access the  service associated with a specific app. |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [ActionCodeSettings](./firebase-admin_.actioncodesettings.md#actioncodesettings_interface) | This is the interface that defines the required continue/state URL with optional Android and iOS bundle identifiers. |
|  [AndroidConfig](./firebase-admin_.androidconfig.md#androidconfig_interface) | Represents the Android-specific options that can be included in an . |
|  [AndroidFcmOptions](./firebase-admin_.androidfcmoptions.md#androidfcmoptions_interface) | Represents options for features provided by the FCM SDK for Android. |
|  [AndroidNotification](./firebase-admin_.androidnotification.md#androidnotification_interface) | Represents the Android-specific notification options that can be included in . |
|  [ApnsConfig](./firebase-admin_.apnsconfig.md#apnsconfig_interface) | Represents the APNs-specific options that can be included in an . Refer to \[Apple documentation\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/CommunicatingwithAPNs.html) for various headers and payload fields supported by APNs. |
|  [ApnsFcmOptions](./firebase-admin_.apnsfcmoptions.md#apnsfcmoptions_interface) | Represents options for features provided by the FCM SDK for iOS. |
|  [ApnsPayload](./firebase-admin_.apnspayload.md#apnspayload_interface) | Represents the payload of an APNs message. Mainly consists of the <code>aps</code> dictionary. But may also contain other arbitrary custom keys. |
|  [App](./firebase-admin_.app.md#app_interface) |  |
|  [AppOptions](./firebase-admin_.appoptions.md#appoptions_interface) | Available options to pass to \[<code>initializeApp()</code>\](admin\#.initializeApp). |
|  [Aps](./firebase-admin_.aps.md#aps_interface) | Represents the \[aps dictionary\](https://developer.apple.com/library/content/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/PayloadKeyReference.html) that is part of APNs messages. |
|  [ApsAlert](./firebase-admin_.apsalert.md#apsalert_interface) |  |
|  [AuthProviderConfig](./firebase-admin_.authproviderconfig.md#authproviderconfig_interface) | The base Auth provider configuration interface. |
|  [AuthProviderConfigFilter](./firebase-admin_.authproviderconfigfilter.md#authproviderconfigfilter_interface) | The filter interface used for listing provider configurations. This is used when specifying how to list configured identity providers via . |
|  [BaseMessage](./firebase-admin_.basemessage.md#basemessage_interface) |  |
|  [BatchResponse](./firebase-admin_.batchresponse.md#batchresponse_interface) | Interface representing the server response from the  and  methods. |
|  [ConditionMessage](./firebase-admin_.conditionmessage.md#conditionmessage_interface) |  |
|  [CreateMultiFactorInfoRequest](./firebase-admin_.createmultifactorinforequest.md#createmultifactorinforequest_interface) | Interface representing base properties of a user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreatePhoneMultiFactorInfoRequest](./firebase-admin_.createphonemultifactorinforequest.md#createphonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for a <code>CreateRequest</code>. |
|  [CreateRequest](./firebase-admin_.createrequest.md#createrequest_interface) | Interface representing the properties to set on a new user record to be created. |
|  [Credential](./firebase-admin_.credential.md#credential_interface) |  |
|  [CriticalSound](./firebase-admin_.criticalsound.md#criticalsound_interface) | Represents a critical sound configuration that can be included in the <code>aps</code> dictionary of an APNs payload. |
|  [DataMessagePayload](./firebase-admin_.datamessagepayload.md#datamessagepayload_interface) | Interface representing an FCM legacy API data message payload. Data messages let developers send up to 4KB of custom key-value pairs. The keys and values must both be strings. Keys can be any custom string, except for the following reserved strings:<!-- -->\* <code>&quot;from&quot;</code> \* Anything starting with <code>&quot;google.&quot;</code>.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [DecodedIdToken](./firebase-admin_.decodedidtoken.md#decodedidtoken_interface) | Interface representing a decoded Firebase ID token, returned from the  method.<!-- -->Firebase ID tokens are OpenID Connect spec-compliant JSON Web Tokens (JWTs). See the \[ID Token section of the OpenID Connect spec\](http://openid.net/specs/openid-connect-core-1\_0.html\#IDToken) for more information about the specific properties below. |
|  [DeleteUsersResult](./firebase-admin_.deleteusersresult.md#deleteusersresult_interface) | Represents the result of the  API. |
|  [EmailIdentifier](./firebase-admin_.emailidentifier.md#emailidentifier_interface) | Used for looking up an account by email.<!-- -->See auth.getUsers() |
|  [EmailSignInProviderConfig](./firebase-admin_.emailsigninproviderconfig.md#emailsigninproviderconfig_interface) | The email sign in configuration. |
|  [FcmOptions](./firebase-admin_.fcmoptions.md#fcmoptions_interface) | Represents platform-independent options for features provided by the FCM SDKs. |
|  [FirebaseArrayIndexError](./firebase-admin_.firebasearrayindexerror.md#firebasearrayindexerror_interface) | Composite type which includes both a <code>FirebaseError</code> object and an index which can be used to get the errored item. |
|  [FirebaseError](./firebase-admin_.firebaseerror.md#firebaseerror_interface) | <code>FirebaseError</code> is a subclass of the standard JavaScript <code>Error</code> object. In addition to a message string and stack trace, it contains a string code. |
|  [GetUsersResult](./firebase-admin_.getusersresult.md#getusersresult_interface) | Represents the result of the  API. |
|  [GoogleOAuthAccessToken](./firebase-admin_.googleoauthaccesstoken.md#googleoauthaccesstoken_interface) | Interface for Google OAuth 2.0 access tokens. |
|  [LightSettings](./firebase-admin_.lightsettings.md#lightsettings_interface) | Represents settings to control notification LED that can be included in . |
|  [ListProviderConfigResults](./firebase-admin_.listproviderconfigresults.md#listproviderconfigresults_interface) | The response interface for listing provider configs. This is only available when listing all identity providers' configurations via . |
|  [ListTenantsResult](./firebase-admin_.listtenantsresult.md#listtenantsresult_interface) | Interface representing the object returned from a  operation. Contains the list of tenants for the current batch and the next page token if available. |
|  [ListUsersResult](./firebase-admin_.listusersresult.md#listusersresult_interface) | Interface representing the object returned from a  operation. Contains the list of users for the current batch and the next page token if available. |
|  [MessagingConditionResponse](./firebase-admin_.messagingconditionresponse.md#messagingconditionresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a condition\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_condition) for code samples and detailed documentation. |
|  [MessagingDeviceGroupResponse](./firebase-admin_.messagingdevicegroupresponse.md#messagingdevicegroupresponse_interface) | Interface representing the server response from the  method.<!-- -->See \[Send messages to device groups\](/docs/cloud-messaging/send-message?authuser=0\#send\_messages\_to\_device\_groups) for code samples and detailed documentation. |
|  [MessagingDeviceResult](./firebase-admin_.messagingdeviceresult.md#messagingdeviceresult_interface) |  |
|  [MessagingDevicesResponse](./firebase-admin_.messagingdevicesresponse.md#messagingdevicesresponse_interface) | Interface representing the status of a message sent to an individual device via the FCM legacy APIs.<!-- -->See \[Send to individual devices\](/docs/cloud-messaging/admin/send-messages\#send\_to\_individual\_devices) for code samples and detailed documentation. |
|  [MessagingOptions](./firebase-admin_.messagingoptions.md#messagingoptions_interface) | Interface representing the options that can be provided when sending a message via the FCM legacy APIs.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingPayload](./firebase-admin_.messagingpayload.md#messagingpayload_interface) | Interface representing a Firebase Cloud Messaging message payload. One or both of the <code>data</code> and <code>notification</code> keys are required.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [MessagingTopicManagementResponse](./firebase-admin_.messagingtopicmanagementresponse.md#messagingtopicmanagementresponse_interface) | Interface representing the server response from the  and  methods.<!-- -->See \[Manage topics from the server\](/docs/cloud-messaging/manage-topics) for code samples and detailed documentation. |
|  [MessagingTopicResponse](./firebase-admin_.messagingtopicresponse.md#messagingtopicresponse_interface) | Interface representing the server response from the legacy  method.<!-- -->See \[Send to a topic\](/docs/cloud-messaging/admin/send-messages\#send\_to\_a\_topic) for code samples and detailed documentation. |
|  [MulticastMessage](./firebase-admin_.multicastmessage.md#multicastmessage_interface) | Payload for the admin.messaing.sendMulticast() method. The payload contains all the fields in the BaseMessage type, and a list of tokens. |
|  [MultiFactorConfig](./firebase-admin_.multifactorconfig.md#multifactorconfig_interface) |  |
|  [MultiFactorCreateSettings](./firebase-admin_.multifactorcreatesettings.md#multifactorcreatesettings_interface) | The multi-factor related user settings for create operations. |
|  [MultiFactorUpdateSettings](./firebase-admin_.multifactorupdatesettings.md#multifactorupdatesettings_interface) | The multi-factor related user settings for update operations. |
|  [Notification](./firebase-admin_.notification.md#notification_interface) | A notification that can be included in . |
|  [NotificationMessagePayload](./firebase-admin_.notificationmessagepayload.md#notificationmessagepayload_interface) | Interface representing an FCM legacy API notification message payload. Notification messages let developers send up to 4KB of predefined key-value pairs. Accepted keys are outlined below.<!-- -->See \[Build send requests\](/docs/cloud-messaging/send-message) for code samples and detailed documentation. |
|  [OIDCAuthProviderConfig](./firebase-admin_.oidcauthproviderconfig.md#oidcauthproviderconfig_interface) | The \[OIDC\](https://openid.net/specs/openid-connect-core-1\_0-final.html) Auth provider configuration interface. An OIDC provider can be created via . |
|  [OIDCUpdateAuthProviderRequest](./firebase-admin_.oidcupdateauthproviderrequest.md#oidcupdateauthproviderrequest_interface) | The request interface for updating an OIDC Auth provider. This is used when updating an OIDC provider's configuration via . |
|  [PhoneIdentifier](./firebase-admin_.phoneidentifier.md#phoneidentifier_interface) | Used for looking up an account by phone number.<!-- -->See auth.getUsers() |
|  [ProviderIdentifier](./firebase-admin_.provideridentifier.md#provideridentifier_interface) | Used for looking up an account by federated provider.<!-- -->See auth.getUsers() |
|  [SAMLAuthProviderConfig](./firebase-admin_.samlauthproviderconfig.md#samlauthproviderconfig_interface) | The \[SAML\](http://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html) Auth provider configuration interface. A SAML provider can be created via . |
|  [SAMLUpdateAuthProviderRequest](./firebase-admin_.samlupdateauthproviderrequest.md#samlupdateauthproviderrequest_interface) | The request interface for updating a SAML Auth provider. This is used when updating a SAML provider's configuration via . |
|  [SendResponse](./firebase-admin_.sendresponse.md#sendresponse_interface) | Interface representing the status of an individual message that was sent as part of a batch request. |
|  [ServiceAccount](./firebase-admin_.serviceaccount.md#serviceaccount_interface) |  |
|  [SessionCookieOptions](./firebase-admin_.sessioncookieoptions.md#sessioncookieoptions_interface) | Interface representing the session cookie options needed for the  method. |
|  [TokenMessage](./firebase-admin_.tokenmessage.md#tokenmessage_interface) |  |
|  [TopicMessage](./firebase-admin_.topicmessage.md#topicmessage_interface) |  |
|  [UidIdentifier](./firebase-admin_.uididentifier.md#uididentifier_interface) | Used for looking up an account by uid.<!-- -->See auth.getUsers() |
|  [UpdateMultiFactorInfoRequest](./firebase-admin_.updatemultifactorinforequest.md#updatemultifactorinforequest_interface) | Interface representing common properties of a user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdatePhoneMultiFactorInfoRequest](./firebase-admin_.updatephonemultifactorinforequest.md#updatephonemultifactorinforequest_interface) | Interface representing a phone specific user enrolled second factor for an <code>UpdateRequest</code>. |
|  [UpdateRequest](./firebase-admin_.updaterequest.md#updaterequest_interface) | Interface representing the properties to update on the provided user. |
|  [UpdateTenantRequest](./firebase-admin_.updatetenantrequest.md#updatetenantrequest_interface) | Interface representing the properties to update on the provided tenant. |
|  [UserImportOptions](./firebase-admin_.userimportoptions.md#userimportoptions_interface) | Interface representing the user import options needed for  method. This is used to provide the password hashing algorithm information. |
|  [UserImportRecord](./firebase-admin_.userimportrecord.md#userimportrecord_interface) | Interface representing a user to import to Firebase Auth via the  method. |
|  [UserImportResult](./firebase-admin_.userimportresult.md#userimportresult_interface) | Interface representing the response from the  method for batch importing users to Firebase Auth. |
|  [UserMetadataRequest](./firebase-admin_.usermetadatarequest.md#usermetadatarequest_interface) | User metadata to include when importing a user. |
|  [UserProviderRequest](./firebase-admin_.userproviderrequest.md#userproviderrequest_interface) | User provider data to include when importing a user. |
|  [WebpushConfig](./firebase-admin_.webpushconfig.md#webpushconfig_interface) | Represents the WebPush protocol options that can be included in an . |
|  [WebpushFcmOptions](./firebase-admin_.webpushfcmoptions.md#webpushfcmoptions_interface) | Represents options for features provided by the FCM SDK for Web (which are not part of the Webpush standard). |
|  [WebpushNotification](./firebase-admin_.webpushnotification.md#webpushnotification_interface) | Represents the WebPush-specific notification options that can be included in . This supports most of the standard options as defined in the Web Notification \[specification\](https://developer.mozilla.org/en-US/docs/Web/API/notification/Notification). |

## Namespaces

|  Namespace | Description |
|  --- | --- |
|  [app](./firebase-admin_.md#app_namespace) |  |
|  [auth](./firebase-admin_.md#auth_namespace) |  |
|  [credential](./firebase-admin_.md#credential_namespace) |  |
|  [database](./firebase-admin_.md#database_namespace) |  |
|  [firestore](./firebase-admin_.md#firestore_namespace) |  |
|  [instanceId](./firebase-admin_.md#instanceid_namespace) |  |
|  [machineLearning](./firebase-admin_.md#machinelearning_namespace) |  |
|  [messaging](./firebase-admin_.md#messaging_namespace) |  |
|  [projectManagement](./firebase-admin_.md#projectmanagement_namespace) |  |
|  [remoteConfig](./firebase-admin_.md#remoteconfig_namespace) |  |
|  [securityRules](./firebase-admin_.md#securityrules_namespace) |  |
|  [storage](./firebase-admin_.md#storage_namespace) |  |

## Variables

|  Variable | Description |
|  --- | --- |
|  [apps](./firebase-admin_.md#apps_variable) |  |
|  [SDK\_VERSION](./firebase-admin_.md#sdk_version_variable) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [AuthFactorType](./firebase-admin_.md#authfactortype_type) | Identifies a second factor type. |
|  [CreateTenantRequest](./firebase-admin_.md#createtenantrequest_type) | Interface representing the properties to set on a new tenant. |
|  [HashAlgorithmType](./firebase-admin_.md#hashalgorithmtype_type) |  |
|  [Message](./firebase-admin_.md#message_type) | Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition. |
|  [MultiFactorConfigState](./firebase-admin_.md#multifactorconfigstate_type) | Identifies a multi-factor configuration state. |
|  [UpdateAuthProviderRequest](./firebase-admin_.md#updateauthproviderrequest_type) |  |
|  [UserIdentifier](./firebase-admin_.md#useridentifier_type) | Identifies a user to be looked up. |

## app() function

<b>Signature:</b>

```typescript
export declare function app(name?: string): app.App;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string |  |

<b>Returns:</b>

[app.App](./firebase-admin_.app.md#appapp_interface)

## applicationDefault() function

<b>Signature:</b>

```typescript
export declare function applicationDefault(httpAgent?: Agent): Credential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  httpAgent | Agent |  |

<b>Returns:</b>

[Credential](./firebase-admin_.credential.md#credential_interface)

## auth() function

Gets the  service for the default app or a given app.

`admin.auth()` can be called with no arguments to access the default app's  service or as `admin.auth(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function auth(app?: App): auth.Auth;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[auth.Auth](./firebase-admin_.md#authauth_type)

## Example 1


```javascript
// Get the Auth service for the default app
var defaultAuth = admin.auth();

```

## Example 2


```javascript
// Get the Auth service for a given app
var otherAuth = admin.auth(otherApp);

```

## cert() function

<b>Signature:</b>

```typescript
export declare function cert(serviceAccountPathOrObject: string | ServiceAccount, httpAgent?: Agent): Credential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  serviceAccountPathOrObject | string \| [ServiceAccount](./firebase-admin_.serviceaccount.md#serviceaccount_interface) |  |
|  httpAgent | Agent |  |

<b>Returns:</b>

[Credential](./firebase-admin_.credential.md#credential_interface)

## database() function

Gets the  service for the default app or a given app.

`admin.database()` can be called with no arguments to access the default app's  service or as `admin.database(app)` to access the  service associated with a specific app.

`admin.database` is also a namespace that can be used to access global constants and methods associated with the `Database` service.

<b>Signature:</b>

```typescript
export declare function database(app?: App): database.Database;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[database.Database](./firebase-admin_.md#databasedatabase_type)

## Example 1


```javascript
// Get the Database service for the default app
var defaultDatabase = admin.database();

```

## Example 2


```javascript
// Get the Database service for a specific app
var otherDatabase = admin.database(app);

```

## deleteApp() function

<b>Signature:</b>

```typescript
export declare function deleteApp(app: App): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

Promise&lt;void&gt;

## firestore() function

<b>Signature:</b>

```typescript
export declare function firestore(app?: App): _firestore.Firestore;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

\_firestore.Firestore

## getApp() function

<b>Signature:</b>

```typescript
export declare function getApp(name?: string): App;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string |  |

<b>Returns:</b>

[App](./firebase-admin_.app.md#app_interface)

## getApps() function

<b>Signature:</b>

```typescript
export declare function getApps(): App[];
```
<b>Returns:</b>

[App](./firebase-admin_.app.md#app_interface)<!-- -->\[\]

## initializeApp() function

<b>Signature:</b>

```typescript
export declare function initializeApp(options?: AppOptions, name?: string): app.App;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [AppOptions](./firebase-admin_.appoptions.md#appoptions_interface) |  |
|  name | string |  |

<b>Returns:</b>

[app.App](./firebase-admin_.app.md#appapp_interface)

## instanceId() function

Gets the  service for the default app or a given app.

`admin.instanceId()` can be called with no arguments to access the default app's  service or as `admin.instanceId(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function instanceId(app?: App): instanceId.InstanceId;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app whose <code>InstanceId</code> service to return. If not provided, the default <code>InstanceId</code> service will be returned. The default <code>InstanceId</code> service if no app is provided or the <code>InstanceId</code> service associated with the provided app. |

<b>Returns:</b>

[instanceId.InstanceId](./firebase-admin_.md#instanceidinstanceid_type)

## Example 1


```javascript
// Get the Instance ID service for the default app
var defaultInstanceId = admin.instanceId();

```

## Example 2


```javascript
// Get the Instance ID service for a given app
var otherInstanceId = admin.instanceId(otherApp);

```

## machineLearning() function

Gets the  service for the default app or a given app.

`admin.machineLearning()` can be called with no arguments to access the default app's  service or as `admin.machineLearning(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function machineLearning(app?: App): machineLearning.MachineLearning;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app whose <code>MachineLearning</code> service to return. If not provided, the default <code>MachineLearning</code> service will be returned. The default <code>MachineLearning</code> service if no app is provided or the <code>MachineLearning</code> service associated with the provided app. |

<b>Returns:</b>

[machineLearning.MachineLearning](./firebase-admin_.md#machinelearningmachinelearning_type)

## Example 1


```javascript
// Get the MachineLearning service for the default app
var defaultMachineLearning = admin.machineLearning();

```

## Example 2


```javascript
// Get the MachineLearning service for a given app
var otherMachineLearning = admin.machineLearning(otherApp);

```

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

## projectManagement() function

Gets the  service for the default app or a given app.

`admin.projectManagement()` can be called with no arguments to access the default app's  service, or as `admin.projectManagement(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function projectManagement(app?: App): projectManagement.ProjectManagement;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app whose <code>ProjectManagement</code> service to return. If not provided, the default <code>ProjectManagement</code> service will be returned. \*  The default <code>ProjectManagement</code> service if no app is provided or the <code>ProjectManagement</code> service associated with the provided app. |

<b>Returns:</b>

[projectManagement.ProjectManagement](./firebase-admin_.md#projectmanagementprojectmanagement_type)

## Example 1


```javascript
// Get the ProjectManagement service for the default app
var defaultProjectManagement = admin.projectManagement();

```

## Example 2


```javascript
// Get the ProjectManagement service for a given app
var otherProjectManagement = admin.projectManagement(otherApp);

```

## refreshToken() function

<b>Signature:</b>

```typescript
export declare function refreshToken(refreshTokenPathOrObject: string | object, httpAgent?: Agent): Credential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  refreshTokenPathOrObject | string \| object |  |
|  httpAgent | Agent |  |

<b>Returns:</b>

[Credential](./firebase-admin_.credential.md#credential_interface)

## remoteConfig() function

Gets the  service for the default app or a given app.

`admin.remoteConfig()` can be called with no arguments to access the default app's  service or as `admin.remoteConfig(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function remoteConfig(app?: App): remoteConfig.RemoteConfig;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app for which to return the <code>RemoteConfig</code> service. If not provided, the default <code>RemoteConfig</code> service is returned. The default <code>RemoteConfig</code> service if no app is provided, or the <code>RemoteConfig</code> service associated with the provided app. |

<b>Returns:</b>

[remoteConfig.RemoteConfig](./firebase-admin_.md#remoteconfigremoteconfig_type)

## Example 1


```javascript
// Get the `RemoteConfig` service for the default app
var defaultRemoteConfig = admin.remoteConfig();

```

## Example 2


```javascript
// Get the `RemoteConfig` service for a given app
var otherRemoteConfig = admin.remoteConfig(otherApp);

```

## securityRules() function

Gets the  service for the default app or a given app.

`admin.securityRules()` can be called with no arguments to access the default app's  service, or as `admin.securityRules(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function securityRules(app?: App): securityRules.SecurityRules;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) | Optional app to return the <code>SecurityRules</code> service for. If not provided, the default <code>SecurityRules</code> service is returned.  The default <code>SecurityRules</code> service if no app is provided, or the <code>SecurityRules</code> service associated with the provided app. |

<b>Returns:</b>

[securityRules.SecurityRules](./firebase-admin_.md#securityrulessecurityrules_type)

## Example 1


```javascript
// Get the SecurityRules service for the default app
var defaultSecurityRules = admin.securityRules();

```

## Example 2

\`\`\`<!-- -->javascript // Get the SecurityRules service for a given app var otherSecurityRules = admin.securityRules(otherApp); \`\`\`

## storage() function

Gets the  service for the default app or a given app.

`admin.storage()` can be called with no arguments to access the default app's  service or as `admin.storage(app)` to access the  service associated with a specific app.

<b>Signature:</b>

```typescript
export declare function storage(app?: App): storage.Storage;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [App](./firebase-admin_.app.md#app_interface) |  |

<b>Returns:</b>

[storage.Storage](./firebase-admin_.md#storagestorage_type)

## Example 1


```javascript
// Get the Storage service for the default app
var defaultStorage = admin.storage();

```

## Example 2


```javascript
// Get the Storage service for a given app
var otherStorage = admin.storage(otherApp);

```

## apps variable

<b>Signature:</b>

```typescript
apps: (app.App | null)[]
```

## SDK\_VERSION variable

<b>Signature:</b>

```typescript
SDK_VERSION: string
```

## AuthFactorType type

Identifies a second factor type.

<b>Signature:</b>

```typescript
export declare type AuthFactorType = 'phone';
```

## CreateTenantRequest type

Interface representing the properties to set on a new tenant.

<b>Signature:</b>

```typescript
export declare type CreateTenantRequest = UpdateTenantRequest;
```

## HashAlgorithmType type

<b>Signature:</b>

```typescript
export declare type HashAlgorithmType = 'SCRYPT' | 'STANDARD_SCRYPT' | 'HMAC_SHA512' | 'HMAC_SHA256' | 'HMAC_SHA1' | 'HMAC_MD5' | 'MD5' | 'PBKDF_SHA1' | 'BCRYPT' | 'PBKDF2_SHA256' | 'SHA512' | 'SHA256' | 'SHA1';
```

## Message type

Payload for the admin.messaging.send() operation. The payload contains all the fields in the BaseMessage type, and exactly one of token, topic or condition.

<b>Signature:</b>

```typescript
export declare type Message = TokenMessage | TopicMessage | ConditionMessage;
```

## MultiFactorConfigState type

Identifies a multi-factor configuration state.

<b>Signature:</b>

```typescript
export declare type MultiFactorConfigState = 'ENABLED' | 'DISABLED';
```

## UpdateAuthProviderRequest type

<b>Signature:</b>

```typescript
export declare type UpdateAuthProviderRequest = SAMLUpdateAuthProviderRequest | OIDCUpdateAuthProviderRequest;
```

## UserIdentifier type

Identifies a user to be looked up.

<b>Signature:</b>

```typescript
export declare type UserIdentifier = UidIdentifier | EmailIdentifier | PhoneIdentifier | ProviderIdentifier;
```
{% endblock body %}
