{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## StorageObserver interface

A stream observer for Firebase Storage.

<b>Signature:</b>

```typescript
export interface StorageObserver<T> 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [complete](./storage-types.storageobserver.md#storageobservercomplete_property) | CompleteFn \| null |  |
|  [error](./storage-types.storageobserver.md#storageobservererror_property) | (error: [FirebaseStorageError](./storage-types.firebasestorageerror.md#firebasestorageerror_interface)<!-- -->) =&gt; void \| null |  |
|  [next](./storage-types.storageobserver.md#storageobservernext_property) | NextFn&lt;T&gt; \| null |  |

## StorageObserver.complete property

<b>Signature:</b>

```typescript
complete?: CompleteFn | null;
```

## StorageObserver.error property

<b>Signature:</b>

```typescript
error?: (error: FirebaseStorageError) => void | null;
```

## StorageObserver.next property

<b>Signature:</b>

```typescript
next?: NextFn<T> | null;
```
{% endblock body %}
