{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## DocumentReference class

A `DocumentReference` refers to a document location in a Firestore database and can be used to write, read, or listen to the location. The document at the referenced location may or may not exist.

<b>Signature:</b>

```typescript
export declare class DocumentReference<T = DocumentData> 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [firestore](./firestore_lite.documentreference.md#documentreferencefirestore_property) |  | [FirebaseFirestore](./firestore_lite.firebasefirestore.md#firebasefirestore_class) | The [FirebaseFirestore](./firestore_.firebasefirestore.md#firebasefirestore_class) the document is in. This is useful for performing transactions, for example. |
|  [id](./firestore_lite.documentreference.md#documentreferenceid_property) |  | string | The document's identifier within its collection. |
|  [parent](./firestore_lite.documentreference.md#documentreferenceparent_property) |  | [CollectionReference](./firestore_lite.collectionreference.md#collectionreference_class)<!-- -->&lt;T&gt; | The collection this <code>DocumentReference</code> belongs to. |
|  [path](./firestore_lite.documentreference.md#documentreferencepath_property) |  | string | A string representing the path of the referenced document (relative to the root of the database). |
|  [type](./firestore_lite.documentreference.md#documentreferencetype_property) |  | (not declared) | The type of this Firestore reference. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [withConverter(converter)](./firestore_lite.documentreference.md#documentreferencewithconverter_method) |  | Applies a custom data converter to this <code>DocumentReference</code>, allowing you to use your own custom model objects with Firestore. When you call , [getDoc()](./firestore_.md#getdoc_function)<!-- -->, etc. with the returned <code>DocumentReference</code> instance, the provided converter will convert between Firestore data and your custom type <code>U</code>. |

## DocumentReference.firestore property

The [FirebaseFirestore](./firestore_.firebasefirestore.md#firebasefirestore_class) the document is in. This is useful for performing transactions, for example.

<b>Signature:</b>

```typescript
readonly firestore: FirebaseFirestore;
```

## DocumentReference.id property

The document's identifier within its collection.

<b>Signature:</b>

```typescript
get id(): string;
```

## DocumentReference.parent property

The collection this `DocumentReference` belongs to.

<b>Signature:</b>

```typescript
get parent(): CollectionReference<T>;
```

## DocumentReference.path property

A string representing the path of the referenced document (relative to the root of the database).

<b>Signature:</b>

```typescript
get path(): string;
```

## DocumentReference.type property

The type of this Firestore reference.

<b>Signature:</b>

```typescript
readonly type = "document";
```

## DocumentReference.withConverter() method

Applies a custom data converter to this `DocumentReference`<!-- -->, allowing you to use your own custom model objects with Firestore. When you call , [getDoc()](./firestore_.md#getdoc_function)<!-- -->, etc. with the returned `DocumentReference` instance, the provided converter will convert between Firestore data and your custom type `U`<!-- -->.

<b>Signature:</b>

```typescript
withConverter<U>(converter: FirestoreDataConverter<U>): DocumentReference<U>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  converter | [FirestoreDataConverter](./firestore_lite.firestoredataconverter.md#firestoredataconverter_interface)<!-- -->&lt;U&gt; | Converts objects to and from Firestore. |

<b>Returns:</b>

[DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;U&gt;

A `DocumentReference<U>` that uses the provided converter.

{% endblock body %}
