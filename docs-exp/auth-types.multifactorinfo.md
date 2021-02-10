{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorInfo interface

A structure containing the information of a second factor entity.

<b>Signature:</b>

```typescript
export interface MultiFactorInfo 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./auth-types.multifactorinfo.md#multifactorinfodisplayname_property) | string \| null | The user friendly name of the current second factor. |
|  [enrollmentTime](./auth-types.multifactorinfo.md#multifactorinfoenrollmenttime_property) | string | The enrollment date of the second factor formatted as a UTC string. |
|  [factorId](./auth-types.multifactorinfo.md#multifactorinfofactorid_property) | [FactorId](./auth-types.md#factorid_enum) | The identifier of the second factor. |
|  [uid](./auth-types.multifactorinfo.md#multifactorinfouid_property) | string | The multi-factor enrollment ID. |

## MultiFactorInfo.displayName property

The user friendly name of the current second factor.

<b>Signature:</b>

```typescript
readonly displayName?: string | null;
```

## MultiFactorInfo.enrollmentTime property

The enrollment date of the second factor formatted as a UTC string.

<b>Signature:</b>

```typescript
readonly enrollmentTime: string;
```

## MultiFactorInfo.factorId property

The identifier of the second factor.

<b>Signature:</b>

```typescript
readonly factorId: FactorId;
```

## MultiFactorInfo.uid property

The multi-factor enrollment ID.

<b>Signature:</b>

```typescript
readonly uid: string;
```
{% endblock body %}
