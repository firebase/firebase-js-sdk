{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorCreateSettings interface

The multi-factor related user settings for create operations.

<b>Signature:</b>

```typescript
export interface MultiFactorCreateSettings 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [enrolledFactors](./firebase-admin_.multifactorcreatesettings.md#multifactorcreatesettingsenrolledfactors_property) | [CreateMultiFactorInfoRequest](./firebase-admin_.createmultifactorinforequest.md#createmultifactorinforequest_interface)<!-- -->\[\] | The created user's list of enrolled second factors. |

## MultiFactorCreateSettings.enrolledFactors property

The created user's list of enrolled second factors.

<b>Signature:</b>

```typescript
enrolledFactors: CreateMultiFactorInfoRequest[];
```
{% endblock body %}
