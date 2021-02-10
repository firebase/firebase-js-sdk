{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## CollectionReference class

A `CollectionReference` object can be used for adding documents, getting document references, and querying for documents (using [query()](./firestore_.md#query_function)<!-- -->).

<b>Signature:</b>

```typescript
export declare class CollectionReference<T = DocumentData> extends Query<T> 
```
<b>Extends:</b> [Query](./firestore_lite.query.md#query_class)<!-- -->&lt;T&gt;

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [firestore](./firestore_lite.collectionreference.md#collectionreferencefirestore_property) |  | [FirebaseFirestore](./firestore_lite.firebasefirestore.md#firebasefirestore_class) |  |
|  [id](./firestore_lite.collectionreference.md#collectionreferenceid_property) |  | string | The collection's identifier. |
|  [parent](./firestore_lite.collectionreference.md#collectionreferenceparent_property) |  | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;[DocumentData](./firestore_lite.documentdata.md#documentdata_interface)<!-- -->&gt; \| null | A reference to the containing <code>DocumentReference</code> if this is a subcollection. If this isn't a subcollection, the reference is null. |
|  [path](./firestore_lite.collectionreference.md#collectionreferencepath_property) |  | string | A string representing the path of the referenced collection (relative to the root of the database). |
|  [type](./firestore_lite.collectionreference.md#collectionreferencetype_property) |  | (not declared) |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [withConverter(converter)](./firestore_lite.collectionreference.md#collectionreferencewithconverter_method) |  | Applies a custom data converter to this CollectionReference, allowing you to use your own custom model objects with Firestore. When you call [addDoc()](./firestore_.md#adddoc_function) with the returned <code>CollectionReference</code> instance, the provided converter will convert between Firestore data and your custom type <code>U</code>. |

## CollectionReference.firestore property

<b>Signature:</b>

```typescript
readonly firestore: FirebaseFirestore;
```

## CollectionReference.id property

The collection's identifier.

<b>Signature:</b>

```typescript
get id(): string;
```

## CollectionReference.parent property

A reference to the containing `DocumentReference` if this is a subcollection. If this isn't a subcollection, the reference is null.

<b>Signature:</b>

```typescript
get parent(): DocumentReference<DocumentData> | null;
```

## CollectionReference.path property

A string representing the path of the referenced collection (relative to the root of the database).

<b>Signature:</b>

```typescript
get path(): string;
```

## CollectionReference.type property

<b>Signature:</b>

```typescript
readonly type = "collection";
```

## CollectionReference.withConverter() method

Applies a custom data converter to this CollectionReference, allowing you to use your own custom model objects with Firestore. When you call [addDoc()](./firestore_.md#adddoc_function) with the returned `CollectionReference` instance, the provided converter will convert between Firestore data and your custom type `U`<!-- -->.

<b>Signature:</b>

```typescript
withConverter<U>(converter: FirestoreDataConverter<U>): CollectionReference<U>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  converter | [FirestoreDataConverter](./firestore_lite.firestoredataconverter.md#firestoredataconverter_interface)<!-- -->&lt;U&gt; | Converts objects to and from Firestore. |

<b>Returns:</b>

[CollectionReference](./firestore_lite.collectionreference.md#collectionreference_class)<!-- -->&lt;U&gt;

A `CollectionReference<U>` that uses the provided converter.

{% endblock body %}
