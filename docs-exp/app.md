{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## app package

Firebase App

## Remarks

This package coordinates the communication between the different Firebase components

## Functions

|  Function | Description |
|  --- | --- |
|  [deleteApp(app)](./app.md#deleteapp_function) | Renders this app unusable and frees the resources of all associated services. |
|  [getApp(name)](./app.md#getapp_function) | Retrieves a FirebaseApp instance.<!-- -->When called with no arguments, the default app is returned. When an app name is provided, the app corresponding to that name is returned.<!-- -->An exception is thrown if the app being retrieved has not yet been initialized. |
|  [getApps()](./app.md#getapps_function) | A (read-only) array of all initialized apps. |
|  [initializeApp(options, name)](./app.md#initializeapp_function) | Creates and initializes a FirebaseApp instance.<!-- -->See [Add Firebase to your app](https://firebase.google.com/docs/web/setup#add_firebase_to_your_app) and [Initialize multiple projects](https://firebase.google.com/docs/web/setup#multiple-projects) for detailed documentation. |
|  [initializeApp(options, config)](./app.md#initializeapp_function) | Creates and initializes a FirebaseApp instance. |
|  [onLog(logCallback, options)](./app.md#onlog_function) | Sets log handler for all Firebase SDKs. |
|  [registerVersion(libraryKeyOrName, version, variant)](./app.md#registerversion_function) | Registers a library's name and version for platform logging purposes. |
|  [setLogLevel(logLevel)](./app.md#setloglevel_function) | Sets log level for all Firebase SDKs.<!-- -->All of the log types above the current log level are captured (i.e. if you set the log level to <code>info</code>, errors are logged, but <code>debug</code> and <code>verbose</code> logs are not). |

## Variables

|  Variable | Description |
|  --- | --- |
|  [SDK\_VERSION](./app.md#sdk_version_variable) | The current SDK version. |

## deleteApp() function

Renders this app unusable and frees the resources of all associated services.

<b>Signature:</b>

```typescript
export declare function deleteApp(app: FirebaseApp): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | [FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface) |  |

<b>Returns:</b>

Promise&lt;void&gt;

## Example


```javascript
deleteApp(app)
  .then(function() {
    console.log("App deleted successfully");
  })
  .catch(function(error) {
    console.log("Error deleting app:", error);
  });

```

## getApp() function

Retrieves a FirebaseApp instance.

When called with no arguments, the default app is returned. When an app name is provided, the app corresponding to that name is returned.

An exception is thrown if the app being retrieved has not yet been initialized.

<b>Signature:</b>

```typescript
export declare function getApp(name?: string): FirebaseApp;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  name | string | Optional name of the app to return. If no name is provided, the default is <code>&quot;[DEFAULT]&quot;</code>. |

<b>Returns:</b>

[FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface)

The app corresponding to the provided app name. If no app name is provided, the default app is returned.

## Example 1


```javascript
// Return the default app
const app = getApp();

```

## Example 2


```javascript
// Return a named app
const otherApp = getApp("otherApp");

```

## getApps() function

A (read-only) array of all initialized apps.

<b>Signature:</b>

```typescript
export declare function getApps(): FirebaseApp[];
```
<b>Returns:</b>

[FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface)<!-- -->\[\]

## initializeApp() function

Creates and initializes a FirebaseApp instance.

See [Add Firebase to your app](https://firebase.google.com/docs/web/setup#add_firebase_to_your_app) and [Initialize multiple projects](https://firebase.google.com/docs/web/setup#multiple-projects) for detailed documentation.

<b>Signature:</b>

```typescript
export declare function initializeApp(options: FirebaseOptions, name?: string): FirebaseApp;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [FirebaseOptions](./app-types.firebaseoptions.md#firebaseoptions_interface) | Options to configure the app's services. |
|  name | string | Optional name of the app to initialize. If no name is provided, the default is <code>&quot;[DEFAULT]&quot;</code>. |

<b>Returns:</b>

[FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface)

The initialized app.

## Example 1


```javascript

// Initialize default app
// Retrieve your own options values by adding a web app on
// https://console.firebase.google.com
initializeApp({
  apiKey: "AIza....",                             // Auth / General Use
  authDomain: "YOUR_APP.firebaseapp.com",         // Auth with popup/redirect
  databaseURL: "https://YOUR_APP.firebaseio.com", // Realtime Database
  storageBucket: "YOUR_APP.appspot.com",          // Storage
  messagingSenderId: "123456789"                  // Cloud Messaging
});

```

## Example 2


```javascript

// Initialize another app
const otherApp = initializeApp({
  databaseURL: "https://<OTHER_DATABASE_NAME>.firebaseio.com",
  storageBucket: "<OTHER_STORAGE_BUCKET>.appspot.com"
}, "otherApp");

```

## initializeApp() function

Creates and initializes a FirebaseApp instance.

<b>Signature:</b>

```typescript
export declare function initializeApp(options: FirebaseOptions, config?: FirebaseAppConfig): FirebaseApp;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [FirebaseOptions](./app-types.firebaseoptions.md#firebaseoptions_interface) | Options to configure the app's services. |
|  config | [FirebaseAppConfig](./app-types.firebaseappconfig.md#firebaseappconfig_interface) | FirebaseApp Configuration |

<b>Returns:</b>

[FirebaseApp](./app-types.firebaseapp.md#firebaseapp_interface)

## onLog() function

Sets log handler for all Firebase SDKs.

<b>Signature:</b>

```typescript
export declare function onLog(logCallback: LogCallback | null, options?: LogOptions): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  logCallback | LogCallback \| null | An optional custom log handler that executes user code whenever the Firebase SDK makes a logging call. |
|  options | LogOptions |  |

<b>Returns:</b>

void

## registerVersion() function

Registers a library's name and version for platform logging purposes.

<b>Signature:</b>

```typescript
export declare function registerVersion(libraryKeyOrName: string, version: string, variant?: string): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  libraryKeyOrName | string |  |
|  version | string | Current version of that library. |
|  variant | string | Bundle variant, e.g., node, rn, etc. |

<b>Returns:</b>

void

## setLogLevel() function

Sets log level for all Firebase SDKs.

All of the log types above the current log level are captured (i.e. if you set the log level to `info`<!-- -->, errors are logged, but `debug` and `verbose` logs are not).

<b>Signature:</b>

```typescript
export declare function setLogLevel(logLevel: LogLevelString): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  logLevel | LogLevelString |  |

<b>Returns:</b>

void

## SDK\_VERSION variable

The current SDK version.

<b>Signature:</b>

```typescript
SDK_VERSION: string
```
{% endblock body %}
