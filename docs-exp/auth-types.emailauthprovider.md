{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## EmailAuthProvider class

Provider for generating [EmailAuthCredential](./auth.emailauthcredential.md#emailauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export abstract class EmailAuthProvider implements AuthProvider 
```
<b>Implements:</b> [AuthProvider](./auth-types.authprovider.md#authprovider_interface)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [EMAIL\_LINK\_SIGN\_IN\_METHOD](./auth-types.emailauthprovider.md#emailauthprovideremail_link_sign_in_method_property) | <code>static</code> | [SignInMethod](./auth-types.md#signinmethod_enum) | Always set to [SignInMethod.EMAIL\_LINK](./auth-types.md#signinmethodemail_link_enummember)<!-- -->. |
|  [EMAIL\_PASSWORD\_SIGN\_IN\_METHOD](./auth-types.emailauthprovider.md#emailauthprovideremail_password_sign_in_method_property) | <code>static</code> | [SignInMethod](./auth-types.md#signinmethod_enum) | Always set to [SignInMethod.EMAIL\_PASSWORD](./auth-types.md#signinmethodemail_password_enummember)<!-- -->. |
|  [PROVIDER\_ID](./auth-types.emailauthprovider.md#emailauthproviderprovider_id_property) | <code>static</code> | [ProviderId](./auth-types.md#providerid_enum) | Always set to [ProviderId.PASSWORD](./auth-types.md#provideridpassword_enummember)<!-- -->, even for email link. |
|  [providerId](./auth-types.emailauthprovider.md#emailauthproviderproviderid_property) |  | [ProviderId](./auth-types.md#providerid_enum) | Always set to [ProviderId.PASSWORD](./auth-types.md#provideridpassword_enummember)<!-- -->, even for email link. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [credential(email, password)](./auth-types.emailauthprovider.md#emailauthprovidercredential_method) | <code>static</code> | Initialize an [AuthCredential](./auth-types.authcredential.md#authcredential_class) using an email and password. |
|  [credentialWithLink(auth, email, emailLink)](./auth-types.emailauthprovider.md#emailauthprovidercredentialwithlink_method) | <code>static</code> | Initialize an [AuthCredential](./auth-types.authcredential.md#authcredential_class) using an email and an email link after a sign in with email link operation. |

## EmailAuthProvider.EMAIL\_LINK\_SIGN\_IN\_METHOD property

Always set to [SignInMethod.EMAIL\_LINK](./auth-types.md#signinmethodemail_link_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly EMAIL_LINK_SIGN_IN_METHOD: SignInMethod;
```

## EmailAuthProvider.EMAIL\_PASSWORD\_SIGN\_IN\_METHOD property

Always set to [SignInMethod.EMAIL\_PASSWORD](./auth-types.md#signinmethodemail_password_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly EMAIL_PASSWORD_SIGN_IN_METHOD: SignInMethod;
```

## EmailAuthProvider.PROVIDER\_ID property

Always set to [ProviderId.PASSWORD](./auth-types.md#provideridpassword_enummember)<!-- -->, even for email link.

<b>Signature:</b>

```typescript
static readonly PROVIDER_ID: ProviderId;
```

## EmailAuthProvider.providerId property

Always set to [ProviderId.PASSWORD](./auth-types.md#provideridpassword_enummember)<!-- -->, even for email link.

<b>Signature:</b>

```typescript
readonly providerId: ProviderId;
```

## EmailAuthProvider.credential() method

Initialize an [AuthCredential](./auth-types.authcredential.md#authcredential_class) using an email and password.

<b>Signature:</b>

```typescript
static credential(email: string, password: string): AuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  email | string | Email address. |
|  password | string | User account password. |

<b>Returns:</b>

[AuthCredential](./auth-types.authcredential.md#authcredential_class)

The auth provider credential.

## Example 1


```javascript
const authCredential = EmailAuthProvider.credential(email, password);
const userCredential = await signInWithCredential(auth, authCredential);

```

## Example 2


```javascript
const userCredential = await signInWithEmailAndPassword(auth, email, password);

```

## EmailAuthProvider.credentialWithLink() method

Initialize an [AuthCredential](./auth-types.authcredential.md#authcredential_class) using an email and an email link after a sign in with email link operation.

<b>Signature:</b>

```typescript
static credentialWithLink(
    auth: Auth,
    email: string,
    emailLink: string
  ): AuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  auth | [Auth](./auth-types.auth.md#auth_interface) | The Auth instance used to verify the link. |
|  email | string | Email address. |
|  emailLink | string | Sign-in email link. |

<b>Returns:</b>

[AuthCredential](./auth-types.authcredential.md#authcredential_class)

- The auth provider credential.

## Example 1


```javascript
const authCredential = EmailAuthProvider.credentialWithLink(auth, email, emailLink);
const userCredential = await signInWithCredential(auth, authCredential);

```

## Example 2


```javascript
await sendSignInLinkToEmail(auth, email);
// Obtain emailLink from user.
const userCredential = await signInWithEmailLink(auth, email, emailLink);

```

{% endblock body %}
