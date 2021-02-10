{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## OAuthProvider class

Provider for generating generic [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export declare class OAuthProvider implements externs.AuthProvider 
```
<b>Implements:</b> externs.[AuthProvider](./auth-types.authprovider.md#authprovider_interface)

## Example 1


```javascript
// Sign in using a redirect.
const provider = new OAuthProvider('google.com');
// Start a sign in process for an unauthenticated user.
provider.addScope('profile');
provider.addScope('email');
await signInWithRedirect(auth, provider);
// This will trigger a full page redirect away from your app

// After returning from the redirect when your app initializes you can obtain the result
const result = await getRedirectResult(auth);
if (result) {
  // This is the signed-in user
  const user = result.user;
  // This gives you a OAuth Access Token for the provider.
  const credential = provider.credentialFromResult(auth, result);
  const token = credential.accessToken;
}

```

## Example 2


```javascript
// Sign in using a popup.
const provider = new OAuthProvider('google.com');
provider.addScope('profile');
provider.addScope('email');
const result = await signInWithPopup(auth, provider);

// The signed-in user info.
const user = result.user;
// This gives you a OAuth Access Token for the provider.
const credential = provider.credentialFromResult(auth, result);
const token = credential.accessToken;

```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(providerId)](./auth.oauthprovider.md#oauthproviderconstructor) |  | Constructor for generic OAuth providers. |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [providerId](./auth.oauthprovider.md#oauthproviderproviderid_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [addScope(scope)](./auth.oauthprovider.md#oauthprovideraddscope_method) |  | Add an OAuth scope to the credential. |
|  [credential(params)](./auth.oauthprovider.md#oauthprovidercredential_method) |  | Creates a [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a generic OAuth provider's access token or ID token. |
|  [credentialFromError(error)](./auth.oauthprovider.md#oauthprovidercredentialfromerror_method) | <code>static</code> | Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [AuthError](./auth-types.autherror.md#autherror_interface) which was thrown during a sign-in, link, or reauthenticate operation. |
|  [credentialFromJSON(json)](./auth.oauthprovider.md#oauthprovidercredentialfromjson_method) | <code>static</code> |  |
|  [credentialFromResult(userCredential)](./auth.oauthprovider.md#oauthprovidercredentialfromresult_method) | <code>static</code> | Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [UserCredential](./auth-types.usercredential.md#usercredential_interface)<!-- -->. |
|  [getCustomParameters()](./auth.oauthprovider.md#oauthprovidergetcustomparameters_method) |  | Retrieve the current list of [CustomParameters](./auth.md#customparameters_type)<!-- -->. |
|  [getScopes()](./auth.oauthprovider.md#oauthprovidergetscopes_method) |  | Retrieve the current list of OAuth scopes. |
|  [setCustomParameters(customOAuthParameters)](./auth.oauthprovider.md#oauthprovidersetcustomparameters_method) |  | Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in operations. |
|  [setDefaultLanguage(languageCode)](./auth.oauthprovider.md#oauthprovidersetdefaultlanguage_method) |  | Set the language gode. |

## OAuthProvider.(constructor)

Constructor for generic OAuth providers.

<b>Signature:</b>

```typescript
constructor(providerId: string);
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  providerId | string | Provider for which credentials should be generated. |

## OAuthProvider.providerId property

<b>Signature:</b>

```typescript
readonly providerId: string;
```

## OAuthProvider.addScope() method

Add an OAuth scope to the credential.

<b>Signature:</b>

```typescript
addScope(scope: string): externs.AuthProvider;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  scope | string | Provider OAuth scope to add. |

<b>Returns:</b>

externs.[AuthProvider](./auth-types.authprovider.md#authprovider_interface)

## OAuthProvider.credential() method

Creates a [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a generic OAuth provider's access token or ID token.

<b>Signature:</b>

```typescript
credential(params: OAuthCredentialOptions): externs.OAuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [OAuthCredentialOptions](./auth.oauthcredentialoptions.md#oauthcredentialoptions_interface) | Either the options object containing the ID token, access token and raw nonce or the ID token string. |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class)

## Remarks

The raw nonce is required when an ID token with a nonce field is provided. The SHA-256 hash of the raw nonce must match the nonce field in the ID token.

## Example


```javascript
// `googleUser` from the onsuccess Google Sign In callback.
// Initialize a generate OAuth provider with a `google.com` providerId.
const provider = new OAuthProvider('google.com');
const credential = provider.credential({
  idToken: googleUser.getAuthResponse().id_token,
});
const result = await signInWithCredential(credential);

```

## OAuthProvider.credentialFromError() method

Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [AuthError](./auth-types.autherror.md#autherror_interface) which was thrown during a sign-in, link, or reauthenticate operation.

<b>Signature:</b>

```typescript
static credentialFromError(error: FirebaseError): externs.OAuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  error | FirebaseError |  |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class) \| null

## OAuthProvider.credentialFromJSON() method

<b>Signature:</b>

```typescript
static credentialFromJSON(json: object | string): externs.OAuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  json | object \| string |  |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class)

## OAuthProvider.credentialFromResult() method

Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [UserCredential](./auth-types.usercredential.md#usercredential_interface)<!-- -->.

<b>Signature:</b>

```typescript
static credentialFromResult(userCredential: externs.UserCredential): externs.OAuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  userCredential | externs.[UserCredential](./auth-types.usercredential.md#usercredential_interface) | The user credential. |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class) \| null

## OAuthProvider.getCustomParameters() method

Retrieve the current list of [CustomParameters](./auth.md#customparameters_type)<!-- -->.

<b>Signature:</b>

```typescript
getCustomParameters(): CustomParameters;
```
<b>Returns:</b>

[CustomParameters](./auth.md#customparameters_type)

## OAuthProvider.getScopes() method

Retrieve the current list of OAuth scopes.

<b>Signature:</b>

```typescript
getScopes(): string[];
```
<b>Returns:</b>

string\[\]

## OAuthProvider.setCustomParameters() method

Sets the OAuth custom parameters to pass in an OAuth request for popup and redirect sign-in operations.

<b>Signature:</b>

```typescript
setCustomParameters(customOAuthParameters: CustomParameters): externs.AuthProvider;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  customOAuthParameters | [CustomParameters](./auth.md#customparameters_type) | The custom OAuth parameters to pass in the OAuth request. |

<b>Returns:</b>

externs.[AuthProvider](./auth-types.authprovider.md#authprovider_interface)

## Remarks

For a detailed list, check the reserved required OAuth 2.0 parameters such as `client_id`<!-- -->, `redirect_uri`<!-- -->, `scope`<!-- -->, `response_type`<!-- -->, and `state` are not allowed and will be ignored.

## OAuthProvider.setDefaultLanguage() method

Set the language gode.

<b>Signature:</b>

```typescript
setDefaultLanguage(languageCode: string | null): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  languageCode | string \| null | language code |

<b>Returns:</b>

void

{% endblock body %}
