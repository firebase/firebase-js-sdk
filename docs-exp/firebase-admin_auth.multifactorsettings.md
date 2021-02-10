{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorSettings class

Class representing multi-factor related properties of a user.

<b>Signature:</b>

```typescript
export declare class MultiFactorSettings 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [enrolledFactors](./firebase-admin_auth.multifactorsettings.md#multifactorsettingsenrolledfactors_property) |  | [MultiFactorInfo](./firebase-admin_.multifactorinfo.md#multifactorinfo_class)<!-- -->\[\] |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_auth.multifactorsettings.md#multifactorsettingstojson_method) |  |  The plain object representation. |

## MultiFactorSettings.enrolledFactors property

<b>Signature:</b>

```typescript
enrolledFactors: MultiFactorInfo[];
```

## MultiFactorSettings.toJSON() method

 The plain object representation.

<b>Signature:</b>

```typescript
toJSON(): any;
```
<b>Returns:</b>

any

{% endblock body %}
