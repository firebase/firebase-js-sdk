{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## GithubAuthProvider class

Provider for generating an [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) for [ProviderId.GITHUB](./auth-types.md#provideridgithub_enummember)<!-- -->.

<b>Signature:</b>

```typescript
export declare class GithubAuthProvider extends OAuthProvider 
```
<b>Extends:</b> [OAuthProvider](./auth.oauthprovider.md#oauthprovider_class)

## Remarks

GitHub requires an OAuth 2.0 redirect, so you can either handle the redirect directly, or use the [signInWithPopup()](./auth.md#signinwithpopup_function) handler:

## Example 1


```javascript
// Sign in using a redirect.
const provider = new GithubAuthProvider();
// Start a sign in process for an unauthenticated user.
provider.addScope('repo');
await signInWithRedirect(auth, provider);
// This will trigger a full page redirect away from your app

// After returning from the redirect when your app initializes you can obtain the result
const result = await getRedirectResult(auth);
if (result) {
  // This is the signed-in user
  const user = result.user;
  // This gives you a Github Access Token.
  const credential = provider.credentialFromResult(auth, result);
  const token = credential.accessToken;
}

```

## Example 2


```javascript
// Sign in using a popup.
const provider = new GithubAuthProvider();
provider.addScope('repo');
const result = await signInWithPopup(auth, provider);

// The signed-in user info.
const user = result.user;
// This gives you a Github Access Token.
const credential = provider.credentialFromResult(auth, result);
const token = credential.accessToken;

```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)()](./auth.githubauthprovider.md#githubauthproviderconstructor) |  | Constructs a new instance of the <code>GithubAuthProvider</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [GITHUB\_SIGN\_IN\_METHOD](./auth.githubauthprovider.md#githubauthprovidergithub_sign_in_method_property) | <code>static</code> | (not declared) | Always set to [SignInMethod.GITHUB](./auth-types.md#signinmethodgithub_enummember)<!-- -->. |
|  [PROVIDER\_ID](./auth.githubauthprovider.md#githubauthproviderprovider_id_property) | <code>static</code> | (not declared) | Always set to [ProviderId.GITHUB](./auth-types.md#provideridgithub_enummember)<!-- -->. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [credential(accessToken)](./auth.githubauthprovider.md#githubauthprovidercredential_method) | <code>static</code> | Creates a credential for Github. |
|  [credentialFromError(error)](./auth.githubauthprovider.md#githubauthprovidercredentialfromerror_method) | <code>static</code> | Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [AuthError](./auth-types.autherror.md#autherror_interface) which was thrown during a sign-in, link, or reauthenticate operation. |
|  [credentialFromResult(userCredential)](./auth.githubauthprovider.md#githubauthprovidercredentialfromresult_method) | <code>static</code> | Used to extract the underlying [OAuthCredential](./auth.oauthcredential.md#oauthcredential_class) from a [UserCredential](./auth-types.usercredential.md#usercredential_interface)<!-- -->. |

## GithubAuthProvider.(constructor)

Constructs a new instance of the `GithubAuthProvider` class

<b>Signature:</b>

```typescript
constructor();
```

## GithubAuthProvider.GITHUB\_SIGN\_IN\_METHOD property

Always set to [SignInMethod.GITHUB](./auth-types.md#signinmethodgithub_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly GITHUB_SIGN_IN_METHOD = externs.SignInMethod.GITHUB;
```

## GithubAuthProvider.PROVIDER\_ID property

Always set to [ProviderId.GITHUB](./auth-types.md#provideridgithub_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly PROVIDER_ID = externs.ProviderId.GITHUB;
```

## GithubAuthProvider.credential() method

Creates a credential for Github.

<b>Signature:</b>

```typescript
static credential(accessToken: string): externs.OAuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  accessToken | string | Github access token. |

<b>Returns:</b>

externs.[OAuthCredential](./auth-types.oauthcredential.md#oauthcredential_class)

## GithubAuthProvider.credentialFromError() method

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

## GithubAuthProvider.credentialFromResult() method

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

{% endblock body %}
