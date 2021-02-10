{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## MultiFactorAssertion interface

The base class for asserting ownership of a second factor.

<b>Signature:</b>

```typescript
export interface MultiFactorAssertion 
```

## Remarks

This is used to facilitate enrollment of a second factor on an existing user or sign-in of a user who already verified the first factor.

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [factorId](./auth-types.multifactorassertion.md#multifactorassertionfactorid_property) | [FactorId](./auth-types.md#factorid_enum) | The identifier of the second factor. |

## MultiFactorAssertion.factorId property

The identifier of the second factor.

<b>Signature:</b>

```typescript
readonly factorId: FactorId;
```
{% endblock body %}
