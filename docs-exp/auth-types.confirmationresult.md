{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ConfirmationResult interface

A result from a phone number sign-in, link, or reauthenticate call.

<b>Signature:</b>

```typescript
export interface ConfirmationResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [verificationId](./auth-types.confirmationresult.md#confirmationresultverificationid_property) | string | The phone number authentication operation's verification ID. |

## Methods

|  Method | Description |
|  --- | --- |
|  [confirm(verificationCode)](./auth-types.confirmationresult.md#confirmationresultconfirm_method) | Finishes a phone number sign-in, link, or reauthentication. |

## ConfirmationResult.verificationId property

The phone number authentication operation's verification ID.

<b>Signature:</b>

```typescript
readonly verificationId: string;
```

## Remarks

This can be used along with the verification code to initialize a [PhoneAuthCredential](./auth-types.phoneauthcredential.md#phoneauthcredential_class)<!-- -->.

## ConfirmationResult.confirm() method

Finishes a phone number sign-in, link, or reauthentication.

<b>Signature:</b>

```typescript
confirm(verificationCode: string): Promise<UserCredential>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  verificationCode | string | The code that was sent to the user's mobile device. |

<b>Returns:</b>

Promise&lt;[UserCredential](./auth-types.usercredential.md#usercredential_interface)<!-- -->&gt;

## Example


```javascript
const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, applicationVerifier);
// Obtain verificationCode from the user.
const userCredential = await confirmationResult.confirm(verificationCode);

```

{% endblock body %}
