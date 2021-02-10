{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## PhoneMultiFactorGenerator class

Provider for generating a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface)<!-- -->.

<b>Signature:</b>

```typescript
export declare class PhoneMultiFactorGenerator implements externs.PhoneMultiFactorGenerator 
```
<b>Implements:</b> externs.[PhoneMultiFactorGenerator](./auth-types.phonemultifactorgenerator.md#phonemultifactorgenerator_class)

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [assertion(credential)](./auth.phonemultifactorgenerator.md#phonemultifactorgeneratorassertion_method) | <code>static</code> | Provides a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) to confirm ownership of the phone second factor. |

## PhoneMultiFactorGenerator.assertion() method

Provides a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) to confirm ownership of the phone second factor.

<b>Signature:</b>

```typescript
static assertion(credential: externs.PhoneAuthCredential): externs.PhoneMultiFactorAssertion;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  credential | externs.[PhoneAuthCredential](./auth-types.phoneauthcredential.md#phoneauthcredential_class) |  |

<b>Returns:</b>

externs.[PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface)

A [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) which can be used with [MultiFactorResolver.resolveSignIn()](./auth-types.multifactorresolver.md#multifactorresolverresolvesignin_method)

{% endblock body %}
