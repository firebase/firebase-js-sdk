Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# TotpMultiFactorGenerator class
Provider for generating a [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface)<!-- -->.

<b>Signature:</b>

```typescript
export declare class TotpMultiFactorGenerator 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [FACTOR\_ID](./auth.totpmultifactorgenerator.md#totpmultifactorgeneratorfactor_id) | <code>static</code> | 'totp' | The identifier of the TOTP second factor: <code>totp</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [assertionForEnrollment(secret, oneTimePassword)](./auth.totpmultifactorgenerator.md#totpmultifactorgeneratorassertionforenrollment) | <code>static</code> | Provides a [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) to confirm ownership of the TOTP (time-based one-time password) second factor. This assertion is used to complete enrollment in TOTP second factor. |
|  [assertionForSignIn(enrollmentId, oneTimePassword)](./auth.totpmultifactorgenerator.md#totpmultifactorgeneratorassertionforsignin) | <code>static</code> | Provides a [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) to confirm ownership of the TOTP second factor. This assertion is used to complete signIn with TOTP as the second factor. |
|  [generateSecret(session)](./auth.totpmultifactorgenerator.md#totpmultifactorgeneratorgeneratesecret) | <code>static</code> | Returns a promise to [TotpSecret](./auth.totpsecret.md#totpsecret_class) which contains the TOTP shared secret key and other parameters. Creates a TOTP secret as part of enrolling a TOTP second factor. Used for generating a QR code URL or inputting into a TOTP app. This method uses the auth instance corresponding to the user in the multiFactorSession. |

## TotpMultiFactorGenerator.FACTOR\_ID

The identifier of the TOTP second factor: `totp`<!-- -->.

<b>Signature:</b>

```typescript
static FACTOR_ID: 'totp';
```

## TotpMultiFactorGenerator.assertionForEnrollment()

Provides a [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) to confirm ownership of the TOTP (time-based one-time password) second factor. This assertion is used to complete enrollment in TOTP second factor.

<b>Signature:</b>

```typescript
static assertionForEnrollment(secret: TotpSecret, oneTimePassword: string): TotpMultiFactorAssertion;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  secret | [TotpSecret](./auth.totpsecret.md#totpsecret_class) | A [TotpSecret](./auth.totpsecret.md#totpsecret_class) containing the shared secret key and other TOTP parameters. |
|  oneTimePassword | string | One-time password from TOTP App. |

<b>Returns:</b>

[TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface)

A [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) which can be used with [MultiFactorUser.enroll()](./auth.multifactoruser.md#multifactoruserenroll)<!-- -->.

## TotpMultiFactorGenerator.assertionForSignIn()

Provides a [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) to confirm ownership of the TOTP second factor. This assertion is used to complete signIn with TOTP as the second factor.

<b>Signature:</b>

```typescript
static assertionForSignIn(enrollmentId: string, oneTimePassword: string): TotpMultiFactorAssertion;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  enrollmentId | string | identifies the enrolled TOTP second factor. |
|  oneTimePassword | string | One-time password from TOTP App. |

<b>Returns:</b>

[TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface)

A [TotpMultiFactorAssertion](./auth.totpmultifactorassertion.md#totpmultifactorassertion_interface) which can be used with [MultiFactorResolver.resolveSignIn()](./auth.multifactorresolver.md#multifactorresolverresolvesignin)<!-- -->.

## TotpMultiFactorGenerator.generateSecret()

Returns a promise to [TotpSecret](./auth.totpsecret.md#totpsecret_class) which contains the TOTP shared secret key and other parameters. Creates a TOTP secret as part of enrolling a TOTP second factor. Used for generating a QR code URL or inputting into a TOTP app. This method uses the auth instance corresponding to the user in the multiFactorSession.

<b>Signature:</b>

```typescript
static generateSecret(session: MultiFactorSession): Promise<TotpSecret>;
```

#### Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  session | [MultiFactorSession](./auth.multifactorsession.md#multifactorsession_interface) | The [MultiFactorSession](./auth.multifactorsession.md#multifactorsession_interface) that the user is part of. |

<b>Returns:</b>

Promise&lt;[TotpSecret](./auth.totpsecret.md#totpsecret_class)<!-- -->&gt;

A promise to [TotpSecret](./auth.totpsecret.md#totpsecret_class)<!-- -->.

