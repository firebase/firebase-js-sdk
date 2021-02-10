{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## PhoneAuthProvider class

Provider for generating an [PhoneAuthCredential](./auth.phoneauthcredential.md#phoneauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export declare class PhoneAuthProvider implements externs.PhoneAuthProvider 
```
<b>Implements:</b> externs.[PhoneAuthProvider](./auth-types.phoneauthprovider.md#phoneauthprovider_class)

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(auth)](./auth.phoneauthprovider.md#phoneauthproviderconstructor) |  | Constructs a new instance of the <code>PhoneAuthProvider</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [PHONE\_SIGN\_IN\_METHOD](./auth.phoneauthprovider.md#phoneauthproviderphone_sign_in_method_property) | <code>static</code> | (not declared) | Always set to [SignInMethod.PHONE](./auth-types.md#signinmethodphone_enummember)<!-- -->. |
|  [PROVIDER\_ID](./auth.phoneauthprovider.md#phoneauthproviderprovider_id_property) | <code>static</code> | (not declared) | Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->. |
|  [providerId](./auth.phoneauthprovider.md#phoneauthproviderproviderid_property) |  | (not declared) | Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [credential(verificationId, verificationCode)](./auth.phoneauthprovider.md#phoneauthprovidercredential_method) | <code>static</code> | Creates a phone auth credential, given the verification ID from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) and the code that was sent to the user's mobile device. |
|  [credentialFromResult(userCredential)](./auth.phoneauthprovider.md#phoneauthprovidercredentialfromresult_method) | <code>static</code> |  |
|  [verifyPhoneNumber(phoneOptions, applicationVerifier)](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) |  | Starts a phone number authentication flow by sending a verification code to the given phone number. |

## PhoneAuthProvider.(constructor)

Constructs a new instance of the `PhoneAuthProvider` class

<b>Signature:</b>

```typescript
constructor(auth: externs.Auth);
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  auth | externs.[Auth](./auth-types.auth.md#auth_interface) |  |

## PhoneAuthProvider.PHONE\_SIGN\_IN\_METHOD property

Always set to [SignInMethod.PHONE](./auth-types.md#signinmethodphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly PHONE_SIGN_IN_METHOD = externs.SignInMethod.PHONE;
```

## PhoneAuthProvider.PROVIDER\_ID property

Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly PROVIDER_ID = externs.ProviderId.PHONE;
```

## PhoneAuthProvider.providerId property

Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
readonly providerId = externs.ProviderId.PHONE;
```

## PhoneAuthProvider.credential() method

Creates a phone auth credential, given the verification ID from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) and the code that was sent to the user's mobile device.

<b>Signature:</b>

```typescript
static credential(verificationId: string, verificationCode: string): PhoneAuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  verificationId | string | The verification ID returned from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method)<!-- -->. |
|  verificationCode | string | The verification code sent to the user's mobile device. |

<b>Returns:</b>

[PhoneAuthCredential](./auth.phoneauthcredential.md#phoneauthcredential_class)

The auth provider credential.

## PhoneAuthProvider.credentialFromResult() method

<b>Signature:</b>

```typescript
static credentialFromResult(userCredential: externs.UserCredential): externs.AuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  userCredential | externs.[UserCredential](./auth-types.usercredential.md#usercredential_interface) |  |

<b>Returns:</b>

externs.[AuthCredential](./auth-types.authcredential.md#authcredential_class) \| null

## PhoneAuthProvider.verifyPhoneNumber() method

Starts a phone number authentication flow by sending a verification code to the given phone number.

<b>Signature:</b>

```typescript
verifyPhoneNumber(phoneOptions: externs.PhoneInfoOptions | string, applicationVerifier: externs.ApplicationVerifier): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  phoneOptions | externs.[PhoneInfoOptions](./auth-types.md#phoneinfooptions_type) \| string |  |
|  applicationVerifier | externs.[ApplicationVerifier](./auth-types.applicationverifier.md#applicationverifier_interface) | For abuse prevention, this method also requires a [ApplicationVerifier](./auth-types.applicationverifier.md#applicationverifier_interface)<!-- -->. This SDK includes a reCAPTCHA-based implementation, [RecaptchaVerifier](./auth.recaptchaverifier.md#recaptchaverifier_class)<!-- -->. |

<b>Returns:</b>

Promise&lt;string&gt;

A Promise for a verification ID that can be passed to [PhoneAuthProvider.credential()](./auth.phoneauthprovider.md#phoneauthprovidercredential_method) to identify this flow..

{% endblock body %}
