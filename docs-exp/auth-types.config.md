{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## Config interface

Interface representing the Auth config.

<b>Signature:</b>

```typescript
export interface Config 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [apiHost](./auth-types.config.md#configapihost_property) | string | The host at which the Firebase Auth backend is running. |
|  [apiKey](./auth-types.config.md#configapikey_property) | string | The API Key used to communicate with the Firebase Auth backend. |
|  [apiScheme](./auth-types.config.md#configapischeme_property) | string | The scheme used to communicate with the Firebase Auth backend. |
|  [authDomain](./auth-types.config.md#configauthdomain_property) | string | The domain at which the web widgets are hosted (provided via Firebase Config). |
|  [sdkClientVersion](./auth-types.config.md#configsdkclientversion_property) | string | The SDK Client Version. |
|  [tokenApiHost](./auth-types.config.md#configtokenapihost_property) | string | The host at which the Secure Token API is running. |

## Config.apiHost property

The host at which the Firebase Auth backend is running.

<b>Signature:</b>

```typescript
apiHost: string;
```

## Config.apiKey property

The API Key used to communicate with the Firebase Auth backend.

<b>Signature:</b>

```typescript
apiKey: string;
```

## Config.apiScheme property

The scheme used to communicate with the Firebase Auth backend.

<b>Signature:</b>

```typescript
apiScheme: string;
```

## Config.authDomain property

The domain at which the web widgets are hosted (provided via Firebase Config).

<b>Signature:</b>

```typescript
authDomain?: string;
```

## Config.sdkClientVersion property

The SDK Client Version.

<b>Signature:</b>

```typescript
sdkClientVersion: string;
```

## Config.tokenApiHost property

The host at which the Secure Token API is running.

<b>Signature:</b>

```typescript
tokenApiHost: string;
```
{% endblock body %}
