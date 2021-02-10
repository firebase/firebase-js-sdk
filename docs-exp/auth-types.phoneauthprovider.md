{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## PhoneAuthProvider class

Provider for generating an [PhoneAuthCredential](./auth.phoneauthcredential.md#phoneauthcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
export class PhoneAuthProvider implements AuthProvider 
```
<b>Implements:</b> [AuthProvider](./auth-types.authprovider.md#authprovider_interface)

## Example


```javascript
// 'recaptcha-container' is the ID of an element in the DOM.
const applicationVerifier = new RecaptchaVerifier('recaptcha-container');
const provider = new PhoneAuthProvider(auth);
const verificationId = await provider.verifyPhoneNumber('+16505550101', applicationVerifier);
// Obtain the verificationCode from the user.
const phoneCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const userCredential = await signInWithCredential(auth, phoneCredential);

```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(auth)](./auth-types.phoneauthprovider.md#phoneauthproviderconstructor) |  | Constructs a new instance of the <code>PhoneAuthProvider</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [PHONE\_SIGN\_IN\_METHOD](./auth-types.phoneauthprovider.md#phoneauthproviderphone_sign_in_method_property) | <code>static</code> | [SignInMethod](./auth-types.md#signinmethod_enum) | Always set to [SignInMethod.PHONE](./auth-types.md#signinmethodphone_enummember)<!-- -->. |
|  [PROVIDER\_ID](./auth-types.phoneauthprovider.md#phoneauthproviderprovider_id_property) | <code>static</code> | [ProviderId](./auth-types.md#providerid_enum) | Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->. |
|  [providerId](./auth-types.phoneauthprovider.md#phoneauthproviderproviderid_property) |  | [ProviderId](./auth-types.md#providerid_enum) | Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [credential(verificationId, verificationCode)](./auth-types.phoneauthprovider.md#phoneauthprovidercredential_method) | <code>static</code> | Creates a phone auth credential, given the verification ID from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) and the code that was sent to the user's mobile device. |
|  [verifyPhoneNumber(phoneInfoOptions, applicationVerifier)](./auth-types.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) |  | Starts a phone number authentication flow by sending a verification code to the given phone number. |

## PhoneAuthProvider.(constructor)

Constructs a new instance of the `PhoneAuthProvider` class

<b>Signature:</b>

```typescript
constructor(auth?: Auth | null);
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  auth | [Auth](./auth-types.auth.md#auth_interface) \| null | The Firebase Auth instance in which sign-ins should occur. |

## Remarks

Uses the default Auth instance if unspecified.

## PhoneAuthProvider.PHONE\_SIGN\_IN\_METHOD property

Always set to [SignInMethod.PHONE](./auth-types.md#signinmethodphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly PHONE_SIGN_IN_METHOD: SignInMethod;
```

## PhoneAuthProvider.PROVIDER\_ID property

Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static readonly PROVIDER_ID: ProviderId;
```

## PhoneAuthProvider.providerId property

Always set to [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
readonly providerId: ProviderId;
```

## PhoneAuthProvider.credential() method

Creates a phone auth credential, given the verification ID from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method) and the code that was sent to the user's mobile device.

<b>Signature:</b>

```typescript
static credential(
    verificationId: string,
    verificationCode: string
  ): AuthCredential;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  verificationId | string | The verification ID returned from [PhoneAuthProvider.verifyPhoneNumber()](./auth.phoneauthprovider.md#phoneauthproviderverifyphonenumber_method)<!-- -->. |
|  verificationCode | string | The verification code sent to the user's mobile device. |

<b>Returns:</b>

[AuthCredential](./auth-types.authcredential.md#authcredential_class)

The auth provider credential.

## Example 1


```javascript
const provider = new PhoneAuthProvider(auth);
const verificationId = provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
// Obtain verificationCode from the user.
const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const userCredential = signInWithCredential(auth, authCredential);

```

## Example 2

An alternative flow is provided using the `signInWithPhoneNumber` method.

```javascript
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
// Obtain verificationCode from the user.
const userCredential = await confirmationResult.confirm(verificationCode);

```

## PhoneAuthProvider.verifyPhoneNumber() method

Starts a phone number authentication flow by sending a verification code to the given phone number.

<b>Signature:</b>

```typescript
verifyPhoneNumber(
    phoneInfoOptions: PhoneInfoOptions | string,
    applicationVerifier: ApplicationVerifier
  ): Promise<string>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  phoneInfoOptions | [PhoneInfoOptions](./auth-types.md#phoneinfooptions_type) \| string | The user's [PhoneInfoOptions](./auth-types.md#phoneinfooptions_type)<!-- -->. The phone number should be in E.164 format (e.g. +16505550101). |
|  applicationVerifier | [ApplicationVerifier](./auth-types.applicationverifier.md#applicationverifier_interface) | For abuse prevention, this method also requires a [ApplicationVerifier](./auth-types.applicationverifier.md#applicationverifier_interface)<!-- -->. This SDK includes a reCAPTCHA-based implementation, [RecaptchaVerifier](./auth-types.recaptchaverifier.md#recaptchaverifier_class)<!-- -->. |

<b>Returns:</b>

Promise&lt;string&gt;

A Promise for a verification ID that can be passed to [PhoneAuthProvider.credential()](./auth.phoneauthprovider.md#phoneauthprovidercredential_method) to identify this flow..

## Example 1


```javascript
const provider = new PhoneAuthProvider(auth);
const verificationId = await provider.verifyPhoneNumber(phoneNumber, applicationVerifier);
// Obtain verificationCode from the user.
const authCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const userCredential = await signInWithCredential(auth, authCredential);

```

## Example 2

An alternative flow is provided using the `signInWithPhoneNumber` method.

```javascript
const confirmationResult = signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
// Obtain verificationCode from the user.
const userCredential = confirmationResult.confirm(verificationCode);

```

{% endblock body %}
