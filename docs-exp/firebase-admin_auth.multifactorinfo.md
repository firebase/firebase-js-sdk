{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorInfo class

Abstract class representing a multi-factor info interface.

<b>Signature:</b>

```typescript
export declare abstract class MultiFactorInfo 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [displayName](./firebase-admin_auth.multifactorinfo.md#multifactorinfodisplayname_property) |  | string |  |
|  [enrollmentTime](./firebase-admin_auth.multifactorinfo.md#multifactorinfoenrollmenttime_property) |  | string |  |
|  [factorId](./firebase-admin_auth.multifactorinfo.md#multifactorinfofactorid_property) |  | string |  |
|  [uid](./firebase-admin_auth.multifactorinfo.md#multifactorinfouid_property) |  | string |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [toJSON()](./firebase-admin_auth.multifactorinfo.md#multifactorinfotojson_method) |  |  The plain object representation. |

## MultiFactorInfo.displayName property

<b>Signature:</b>

```typescript
readonly displayName?: string;
```

## MultiFactorInfo.enrollmentTime property

<b>Signature:</b>

```typescript
readonly enrollmentTime?: string;
```

## MultiFactorInfo.factorId property

<b>Signature:</b>

```typescript
readonly factorId: string;
```

## MultiFactorInfo.uid property

<b>Signature:</b>

```typescript
readonly uid: string;
```

## MultiFactorInfo.toJSON() method

 The plain object representation.

<b>Signature:</b>

```typescript
toJSON(): any;
```
<b>Returns:</b>

any

{% endblock body %}
