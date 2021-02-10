{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## PhoneMultiFactorGenerator class

Provider for generating a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface)<!-- -->.

<b>Signature:</b>

```typescript
export abstract class PhoneMultiFactorGenerator 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [FACTOR\_ID](./auth-types.phonemultifactorgenerator.md#phonemultifactorgeneratorfactor_id_property) | <code>static</code> | [ProviderId](./auth-types.md#providerid_enum) | The identifier of the phone second factor: [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [assertion(phoneAuthCredential)](./auth-types.phonemultifactorgenerator.md#phonemultifactorgeneratorassertion_method) | <code>static</code> | Provides a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) to confirm ownership of the phone second factor. |

## PhoneMultiFactorGenerator.FACTOR\_ID property

The identifier of the phone second factor: [ProviderId.PHONE](./auth-types.md#provideridphone_enummember)<!-- -->.

<b>Signature:</b>

```typescript
static FACTOR_ID: ProviderId;
```

## PhoneMultiFactorGenerator.assertion() method

Provides a [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) to confirm ownership of the phone second factor.

<b>Signature:</b>

```typescript
static assertion(
    phoneAuthCredential: PhoneAuthCredential
  ): PhoneMultiFactorAssertion;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  phoneAuthCredential | [PhoneAuthCredential](./auth-types.phoneauthcredential.md#phoneauthcredential_class) | A credential provided by [PhoneAuthProvider.credential()](./auth.phoneauthprovider.md#phoneauthprovidercredential_method)<!-- -->. |

<b>Returns:</b>

[PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface)

A [PhoneMultiFactorAssertion](./auth-types.phonemultifactorassertion.md#phonemultifactorassertion_interface) which can be used with [MultiFactorResolver.resolveSignIn()](./auth-types.multifactorresolver.md#multifactorresolverresolvesignin_method)

{% endblock body %}
