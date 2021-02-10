{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AppOptions interface

Available options to pass to \[`initializeApp()`<!-- -->\](admin\#.initializeApp).

<b>Signature:</b>

```typescript
export interface AppOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [credential](./firebase-admin_.appoptions.md#appoptionscredential_property) | [Credential](./firebase-admin_.credential.md#credential_interface) | A  object used to authenticate the Admin SDK.<!-- -->See \[Initialize the SDK\](/docs/admin/setup\#initialize\_the\_sdk) for detailed documentation and code samples. |
|  [databaseAuthVariableOverride](./firebase-admin_.appoptions.md#appoptionsdatabaseauthvariableoverride_property) | object \| null | The object to use as the \[<code>auth</code>\](/docs/reference/security/database/\#auth) variable in your Realtime Database Rules when the Admin SDK reads from or writes to the Realtime Database. This allows you to downscope the Admin SDK from its default full read and write privileges.<!-- -->You can pass <code>null</code> to act as an unauthenticated client.<!-- -->See \[Authenticate with limited privileges\](/docs/database/admin/start\#authenticate-with-limited-privileges) for detailed documentation and code samples. |
|  [databaseURL](./firebase-admin_.appoptions.md#appoptionsdatabaseurl_property) | string | The URL of the Realtime Database from which to read and write data. |
|  [httpAgent](./firebase-admin_.appoptions.md#appoptionshttpagent_property) | Agent | An \[HTTP Agent\](https://nodejs.org/api/http.html\#http\_class\_http\_agent) to be used when making outgoing HTTP calls. This Agent instance is used by all services that make REST calls (e.g. <code>auth</code>, <code>messaging</code>, <code>projectManagement</code>).<!-- -->Realtime Database and Firestore use other means of communicating with the backend servers, so they do not use this HTTP Agent. <code>Credential</code> instances also do not use this HTTP Agent, but instead support specifying an HTTP Agent in the corresponding factory methods. |
|  [projectId](./firebase-admin_.appoptions.md#appoptionsprojectid_property) | string | The ID of the Google Cloud project associated with the App. |
|  [serviceAccountId](./firebase-admin_.appoptions.md#appoptionsserviceaccountid_property) | string | The ID of the service account to be used for signing custom tokens. This can be found in the <code>client_email</code> field of a service account JSON file. |
|  [storageBucket](./firebase-admin_.appoptions.md#appoptionsstoragebucket_property) | string | The name of the Google Cloud Storage bucket used for storing application data. Use only the bucket name without any prefixes or additions (do \*not\* prefix the name with "gs://"). |

## AppOptions.credential property

A  object used to authenticate the Admin SDK.

See \[Initialize the SDK\](/docs/admin/setup\#initialize\_the\_sdk) for detailed documentation and code samples.

<b>Signature:</b>

```typescript
credential?: Credential;
```

## AppOptions.databaseAuthVariableOverride property

The object to use as the \[`auth`<!-- -->\](/docs/reference/security/database/\#auth) variable in your Realtime Database Rules when the Admin SDK reads from or writes to the Realtime Database. This allows you to downscope the Admin SDK from its default full read and write privileges.

You can pass `null` to act as an unauthenticated client.

See \[Authenticate with limited privileges\](/docs/database/admin/start\#authenticate-with-limited-privileges) for detailed documentation and code samples.

<b>Signature:</b>

```typescript
databaseAuthVariableOverride?: object | null;
```

## AppOptions.databaseURL property

The URL of the Realtime Database from which to read and write data.

<b>Signature:</b>

```typescript
databaseURL?: string;
```

## AppOptions.httpAgent property

An \[HTTP Agent\](https://nodejs.org/api/http.html\#http\_class\_http\_agent) to be used when making outgoing HTTP calls. This Agent instance is used by all services that make REST calls (e.g. `auth`<!-- -->, `messaging`<!-- -->, `projectManagement`<!-- -->).

Realtime Database and Firestore use other means of communicating with the backend servers, so they do not use this HTTP Agent. `Credential` instances also do not use this HTTP Agent, but instead support specifying an HTTP Agent in the corresponding factory methods.

<b>Signature:</b>

```typescript
httpAgent?: Agent;
```

## AppOptions.projectId property

The ID of the Google Cloud project associated with the App.

<b>Signature:</b>

```typescript
projectId?: string;
```

## AppOptions.serviceAccountId property

The ID of the service account to be used for signing custom tokens. This can be found in the `client_email` field of a service account JSON file.

<b>Signature:</b>

```typescript
serviceAccountId?: string;
```

## AppOptions.storageBucket property

The name of the Google Cloud Storage bucket used for storing application data. Use only the bucket name without any prefixes or additions (do \*not\* prefix the name with "gs://").

<b>Signature:</b>

```typescript
storageBucket?: string;
```
{% endblock body %}
