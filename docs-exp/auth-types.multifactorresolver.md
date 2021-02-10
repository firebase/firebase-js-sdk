{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorResolver interface

The class used to facilitate recovery from [MultiFactorError](./auth-types.multifactorerror.md#multifactorerror_interface) when a user needs to provide a second factor to sign in.

<b>Signature:</b>

```typescript
export interface MultiFactorResolver 
```

## Example


```javascript
let resolver;
let multiFactorHints;

signInWithEmailAndPassword(auth, email, password)
    .then((result) => {
      // User signed in. No 2nd factor challenge is needed.
    })
    .catch((error) => {
      if (error.code == 'auth/multi-factor-auth-required') {
        resolver = getMultiFactorResolver(auth, error);
        // Show UI to let user select second factor.
        multiFactorHints = resolver.hints;
      } else {
        // Handle other errors.
      }
    });

// The enrolled second factors that can be used to complete
// sign-in are returned in the `MultiFactorResolver.hints` list.
// UI needs to be presented to allow the user to select a second factor
// from that list.

const selectedHint = // ; selected from multiFactorHints
const phoneAuthProvider = new PhoneAuthProvider(auth);
const phoneInfoOptions = {
  multiFactorHint: selectedHint,
  session: resolver.session
};
const verificationId = phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, appVerifier);
// Store `verificationId` and show UI to let user enter verification code.

// UI to enter verification code and continue.
// Continue button click handler
const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [hints](./auth-types.multifactorresolver.md#multifactorresolverhints_property) | [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface)<!-- -->\[\] | The list of hints for the second factors needed to complete the sign-in for the current session. |
|  [session](./auth-types.multifactorresolver.md#multifactorresolversession_property) | [MultiFactorSession](./auth-types.multifactorsession.md#multifactorsession_interface) | The session identifier for the current sign-in flow, which can be used to complete the second factor sign-in. |

## Methods

|  Method | Description |
|  --- | --- |
|  [resolveSignIn(assertion)](./auth-types.multifactorresolver.md#multifactorresolverresolvesignin_method) | A helper function to help users complete sign in with a second factor using an [MultiFactorAssertion](./auth-types.multifactorassertion.md#multifactorassertion_interface) confirming the user successfully completed the second factor challenge. |

## MultiFactorResolver.hints property

The list of hints for the second factors needed to complete the sign-in for the current session.

<b>Signature:</b>

```typescript
readonly hints: MultiFactorInfo[];
```

## MultiFactorResolver.session property

The session identifier for the current sign-in flow, which can be used to complete the second factor sign-in.

<b>Signature:</b>

```typescript
readonly session: MultiFactorSession;
```

## MultiFactorResolver.resolveSignIn() method

A helper function to help users complete sign in with a second factor using an [MultiFactorAssertion](./auth-types.multifactorassertion.md#multifactorassertion_interface) confirming the user successfully completed the second factor challenge.

<b>Signature:</b>

```typescript
resolveSignIn(assertion: MultiFactorAssertion): Promise<UserCredential>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  assertion | [MultiFactorAssertion](./auth-types.multifactorassertion.md#multifactorassertion_interface) | The multi-factor assertion to resolve sign-in with. |

<b>Returns:</b>

Promise&lt;[UserCredential](./auth-types.usercredential.md#usercredential_interface)<!-- -->&gt;

The promise that resolves with the user credential object.

## Example


```javascript
const phoneAuthCredential = PhoneAuthProvider.credential(verificationId, verificationCode);
const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(phoneAuthCredential);
const userCredential = await resolver.resolveSignIn(multiFactorAssertion);

```

{% endblock body %}
