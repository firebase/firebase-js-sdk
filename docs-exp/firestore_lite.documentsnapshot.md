{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## DocumentSnapshot class

A `DocumentSnapshot` contains data read from a document in your Firestore database. The data can be extracted with `.data()` or `.get(<field>)` to get a specific field.

For a `DocumentSnapshot` that points to a non-existing document, any data access will return 'undefined'. You can use the `exists()` method to explicitly verify a document's existence.

<b>Signature:</b>

```typescript
export declare class DocumentSnapshot<T = DocumentData> 
```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)()](./firestore_lite.documentsnapshot.md#documentsnapshotconstructor) |  | Constructs a new instance of the <code>DocumentSnapshot</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [id](./firestore_lite.documentsnapshot.md#documentsnapshotid_property) |  | string | Property of the <code>DocumentSnapshot</code> that provides the document's ID. |
|  [ref](./firestore_lite.documentsnapshot.md#documentsnapshotref_property) |  | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; | The <code>DocumentReference</code> for the document included in the <code>DocumentSnapshot</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [data()](./firestore_lite.documentsnapshot.md#documentsnapshotdata_method) |  | Retrieves all fields in the document as an <code>Object</code>. Returns <code>undefined</code> if the document doesn't exist. |
|  [exists()](./firestore_lite.documentsnapshot.md#documentsnapshotexists_method) |  | Signals whether or not the document at the snapshot's location exists. |
|  [get(fieldPath)](./firestore_lite.documentsnapshot.md#documentsnapshotget_method) |  | Retrieves the field specified by <code>fieldPath</code>. Returns <code>undefined</code> if the document or field doesn't exist. |

## DocumentSnapshot.(constructor)

Constructs a new instance of the `DocumentSnapshot` class

<b>Signature:</b>

```typescript
protected constructor();
```

## DocumentSnapshot.id property

Property of the `DocumentSnapshot` that provides the document's ID.

<b>Signature:</b>

```typescript
get id(): string;
```

## DocumentSnapshot.ref property

The `DocumentReference` for the document included in the `DocumentSnapshot`<!-- -->.

<b>Signature:</b>

```typescript
get ref(): DocumentReference<T>;
```

## DocumentSnapshot.data() method

Retrieves all fields in the document as an `Object`<!-- -->. Returns `undefined` if the document doesn't exist.

<b>Signature:</b>

```typescript
data(): T | undefined;
```
<b>Returns:</b>

T \| undefined

An `Object` containing all fields in the document or `undefined` if the document doesn't exist.

## DocumentSnapshot.exists() method

Signals whether or not the document at the snapshot's location exists.

<b>Signature:</b>

```typescript
exists(): this is QueryDocumentSnapshot<T>;
```
<b>Returns:</b>

this is [QueryDocumentSnapshot](./firestore_lite.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;T&gt;

true if the document exists.

## DocumentSnapshot.get() method

Retrieves the field specified by `fieldPath`<!-- -->. Returns `undefined` if the document or field doesn't exist.

<b>Signature:</b>

```typescript
get(fieldPath: string | FieldPath): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  fieldPath | string \| [FieldPath](./firestore_lite.fieldpath.md#fieldpath_class) | The path (for example 'foo' or 'foo.bar') to a specific field. |

<b>Returns:</b>

any

The data at the specified field location or undefined if no such field exists in the document.

{% endblock body %}
