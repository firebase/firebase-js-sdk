{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## FirestoreError class

An error returned by a Firestore operation.

<b>Signature:</b>

```typescript
export declare class FirestoreError 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [code](./firestore_.firestoreerror.md#firestoreerrorcode_property) |  | [FirestoreErrorCode](./firestore_.md#firestoreerrorcode_type) |  |
|  [message](./firestore_.firestoreerror.md#firestoreerrormessage_property) |  | string |  |
|  [name](./firestore_.firestoreerror.md#firestoreerrorname_property) |  | string |  |
|  [stack](./firestore_.firestoreerror.md#firestoreerrorstack_property) |  | string |  |

## FirestoreError.code property

<b>Signature:</b>

```typescript
readonly code: FirestoreErrorCode;
```

## FirestoreError.message property

<b>Signature:</b>

```typescript
readonly message: string;
```

## FirestoreError.name property

<b>Signature:</b>

```typescript
readonly name: string;
```

## FirestoreError.stack property

<b>Signature:</b>

```typescript
readonly stack?: string;
```
{% endblock body %}
