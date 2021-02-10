{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## PhoneMultiFactorInfo class

Class representing a phone MultiFactorInfo object.

<b>Signature:</b>

```typescript
export declare class PhoneMultiFactorInfo extends MultiFactorInfo 
```
<b>Extends:</b> [MultiFactorInfo](./firebase-admin_.multifactorinfo.md#multifactorinfo_class)

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [phoneNumber](./firebase-admin_.phonemultifactorinfo.md#phonemultifactorinfophonenumber_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_.phonemultifactorinfo.md#phonemultifactorinfotojson_method) |  |  The plain object representation. |

## PhoneMultiFactorInfo.phoneNumber property

<b>Signature:</b>

```typescript
readonly phoneNumber: string;
```

## PhoneMultiFactorInfo.toJSON() method

 The plain object representation.

<b>Signature:</b>

```typescript
toJSON(): any;
```
<b>Returns:</b>

any

{% endblock body %}
