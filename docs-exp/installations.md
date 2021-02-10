{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## installations package

## Functions

|  Function | Description |
|  --- | --- |
|  [deleteInstallations(installations)](./installations.md#deleteinstallations_function) | Deletes the Firebase Installation and all associated data. |
|  [getId(installations)](./installations.md#getid_function) | Creates a Firebase Installation if there isn't one for the app and returns the Installation ID. |
|  [getInstallations(app)](./installations.md#getinstallations_function) | Returns an instance of FirebaseInstallations associated with the given FirebaseApp instance. |
|  [getToken(installations, forceRefresh)](./installations.md#gettoken_function) | Returns an Installation auth token, identifying the current Firebase Installation. |
|  [onIdChange(installations, callback)](./installations.md#onidchange_function) | Sets a new callback that will get called when Installation ID changes. Returns an unsubscribe function that will remove the callback when called. |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [IdChangeCallbackFn](./installations.md#idchangecallbackfn_type) | An user defined callback function that gets called when Installations ID changes. |
|  [IdChangeUnsubscribeFn](./installations.md#idchangeunsubscribefn_type) | Unsubscribe a callback function previously added via . |

## deleteInstallations() function

Deletes the Firebase Installation and all associated data.

<b>Signature:</b>

```typescript
export declare function deleteInstallations(installations: FirebaseInstallations): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  installations | [FirebaseInstallations](./installations-types.firebaseinstallations.md#firebaseinstallations_interface) |  |

<b>Returns:</b>

Promise&lt;void&gt;

## getId() function

Creates a Firebase Installation if there isn't one for the app and returns the Installation ID.

<b>Signature:</b>

```typescript
export declare function getId(installations: FirebaseInstallations): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  installations | [FirebaseInstallations](./installations-types.firebaseinstallations.md#firebaseinstallations_interface) |  |

<b>Returns:</b>

Promise&lt;string&gt;

## getInstallations() function

Returns an instance of FirebaseInstallations associated with the given FirebaseApp instance.

<b>Signature:</b>

```typescript
export declare function getInstallations(app: FirebaseApp): FirebaseInstallations;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface) |  |

<b>Returns:</b>

[FirebaseInstallations](./installations-types.firebaseinstallations.md#firebaseinstallations_interface)

## getToken() function

Returns an Installation auth token, identifying the current Firebase Installation.

<b>Signature:</b>

```typescript
export declare function getToken(installations: FirebaseInstallations, forceRefresh?: boolean): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  installations | [FirebaseInstallations](./installations-types.firebaseinstallations.md#firebaseinstallations_interface) |  |
|  forceRefresh | boolean |  |

<b>Returns:</b>

Promise&lt;string&gt;

## onIdChange() function

Sets a new callback that will get called when Installation ID changes. Returns an unsubscribe function that will remove the callback when called.

<b>Signature:</b>

```typescript
export declare function onIdChange(installations: FirebaseInstallations, callback: IdChangeCallbackFn): IdChangeUnsubscribeFn;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  installations | [FirebaseInstallations](./installations-types.firebaseinstallations.md#firebaseinstallations_interface) |  |
|  callback | [IdChangeCallbackFn](./installations.md#idchangecallbackfn_type) |  |

<b>Returns:</b>

[IdChangeUnsubscribeFn](./installations.md#idchangeunsubscribefn_type)

## IdChangeCallbackFn type

An user defined callback function that gets called when Installations ID changes.

<b>Signature:</b>

```typescript
export declare type IdChangeCallbackFn = (installationId: string) => void;
```

## IdChangeUnsubscribeFn type

Unsubscribe a callback function previously added via .

<b>Signature:</b>

```typescript
export declare type IdChangeUnsubscribeFn = () => void;
```
{% endblock body %}
