{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Auth interface

Interface representing Firebase Auth service.

<b>Signature:</b>

```typescript
export interface Auth 
```

## Remarks

See [Firebase Authentication](https://firebase.google.com/docs/auth/) for a full guide on how to use the Firebase Auth service.

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [config](./auth-types.auth.md#authconfig_property) | [Config](./auth-types.config.md#config_interface) | The [Config](./auth-types.config.md#config_interface) used to initialize this instance. |
|  [currentUser](./auth-types.auth.md#authcurrentuser_property) | [User](./auth-types.user.md#user_interface) \| null | The currently signed-in user (or null). |
|  [languageCode](./auth-types.auth.md#authlanguagecode_property) | string \| null | The Auth instance's language code. |
|  [name](./auth-types.auth.md#authname_property) | string | The name of the app associated with the Auth service instance. |
|  [settings](./auth-types.auth.md#authsettings_property) | [AuthSettings](./auth-types.authsettings.md#authsettings_interface) | The Auth instance's settings. |
|  [tenantId](./auth-types.auth.md#authtenantid_property) | string \| null | The Auth instance's tenant ID. |

## Methods

|  Method | Description |
|  --- | --- |
|  [onAuthStateChanged(nextOrObserver, error, completed)](./auth-types.auth.md#authonauthstatechanged_method) | Adds an observer for changes to the user's sign-in state. |
|  [onIdTokenChanged(nextOrObserver, error, completed)](./auth-types.auth.md#authonidtokenchanged_method) | Adds an observer for changes to the signed-in user's ID token. |
|  [setPersistence(persistence)](./auth-types.auth.md#authsetpersistence_method) | Changes the type of persistence on the Auth instance. |
|  [signOut()](./auth-types.auth.md#authsignout_method) | Signs out the current user. |
|  [updateCurrentUser(user)](./auth-types.auth.md#authupdatecurrentuser_method) | Asynchronously sets the provided user as [Auth.currentUser](./auth-types.auth.md#authcurrentuser_property) on the [Auth](./auth-types.auth.md#auth_interface) instance. |
|  [useDeviceLanguage()](./auth-types.auth.md#authusedevicelanguage_method) | Sets the current language to the default device/browser preference. |

## Auth.config property

The [Config](./auth-types.config.md#config_interface) used to initialize this instance.

<b>Signature:</b>

```typescript
readonly config: Config;
```

## Auth.currentUser property

The currently signed-in user (or null).

<b>Signature:</b>

```typescript
readonly currentUser: User | null;
```

## Auth.languageCode property

The Auth instance's language code.

<b>Signature:</b>

```typescript
languageCode: string | null;
```

## Remarks

This is a readable/writable property. When set to null, the default Firebase Console language setting is applied. The language code will propagate to email action templates (password reset, email verification and email change revocation), SMS templates for phone authentication, reCAPTCHA verifier and OAuth popup/redirect operations provided the specified providers support localization with the language code specified.

## Auth.name property

The name of the app associated with the Auth service instance.

<b>Signature:</b>

```typescript
readonly name: string;
```

## Auth.settings property

The Auth instance's settings.

<b>Signature:</b>

```typescript
readonly settings: AuthSettings;
```

## Remarks

This is used to edit/read configuration related options such as app verification mode for phone authentication.

## Auth.tenantId property

The Auth instance's tenant ID.

<b>Signature:</b>

```typescript
tenantId: string | null;
```

## Remarks

This is a readable/writable property. When you set the tenant ID of an Auth instance, all future sign-in/sign-up operations will pass this tenant ID and sign in or sign up users to the specified tenant project. When set to null, users are signed in to the parent project.

## Example


```javascript
// Set the tenant ID on Auth instance.
auth.tenantId = 'TENANT_PROJECT_ID';

// All future sign-in request now include tenant ID.
const result = await signInWithEmailAndPassword(auth, email, password);
// result.user.tenantId should be 'TENANT_PROJECT_ID'.

```

## Auth.onAuthStateChanged() method

Adds an observer for changes to the user's sign-in state.

<b>Signature:</b>

```typescript
onAuthStateChanged(
    nextOrObserver: NextOrObserver<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  nextOrObserver | [NextOrObserver](./auth-types.md#nextorobserver_type)<!-- -->&lt;[User](./auth-types.user.md#user_interface) \| null&gt; | callback triggered on change. |
|  error | ErrorFn | callback triggered on error. |
|  completed | CompleteFn | callback triggered when observer is removed. |

<b>Returns:</b>

Unsubscribe

## Remarks

To keep the old behavior, see [Auth.onIdTokenChanged()](./auth-types.auth.md#authonidtokenchanged_method)<!-- -->.

## Auth.onIdTokenChanged() method

Adds an observer for changes to the signed-in user's ID token.

<b>Signature:</b>

```typescript
onIdTokenChanged(
    nextOrObserver: NextOrObserver<User | null>,
    error?: ErrorFn,
    completed?: CompleteFn
  ): Unsubscribe;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  nextOrObserver | [NextOrObserver](./auth-types.md#nextorobserver_type)<!-- -->&lt;[User](./auth-types.user.md#user_interface) \| null&gt; | callback triggered on change. |
|  error | ErrorFn | callback triggered on error. |
|  completed | CompleteFn | callback triggered when observer is removed. |

<b>Returns:</b>

Unsubscribe

## Remarks

This includes sign-in, sign-out, and token refresh events.

## Auth.setPersistence() method

Changes the type of persistence on the Auth instance.

<b>Signature:</b>

```typescript
setPersistence(persistence: Persistence): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  persistence | [Persistence](./auth-types.persistence.md#persistence_interface) | The [Persistence](./auth-types.persistence.md#persistence_interface) to use. |

<b>Returns:</b>

Promise&lt;void&gt;

## Remarks

This will affect the currently saved Auth session and applies this type of persistence for future sign-in requests, including sign-in with redirect requests.

This makes it easy for a user signing in to specify whether their session should be remembered or not. It also makes it easier to never persist the Auth state for applications that are shared by other users or have sensitive data.

## Example


```javascript
auth.setPersistence(browserSessionPersistence);

```

## Auth.signOut() method

Signs out the current user.

<b>Signature:</b>

```typescript
signOut(): Promise<void>;
```
<b>Returns:</b>

Promise&lt;void&gt;

## Auth.updateCurrentUser() method

Asynchronously sets the provided user as [Auth.currentUser](./auth-types.auth.md#authcurrentuser_property) on the [Auth](./auth-types.auth.md#auth_interface) instance.

<b>Signature:</b>

```typescript
updateCurrentUser(user: User | null): Promise<void>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  user | [User](./auth-types.user.md#user_interface) \| null | The new [User](./auth-types.user.md#user_interface)<!-- -->. |

<b>Returns:</b>

Promise&lt;void&gt;

## Remarks

A new instance copy of the user provided will be made and set as currentUser.

This will trigger [Auth.onAuthStateChanged()](./auth-types.auth.md#authonauthstatechanged_method) and [Auth.onIdTokenChanged()](./auth-types.auth.md#authonidtokenchanged_method) listeners like other sign in methods.

The operation fails with an error if the user to be updated belongs to a different Firebase project.

## Auth.useDeviceLanguage() method

Sets the current language to the default device/browser preference.

<b>Signature:</b>

```typescript
useDeviceLanguage(): void;
```
<b>Returns:</b>

void

{% endblock body %}
