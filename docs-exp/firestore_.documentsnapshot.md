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
|  [(constructor)()](./firestore_.documentsnapshot.md#documentsnapshotconstructor) |  | Constructs a new instance of the <code>DocumentSnapshot</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [id](./firestore_.documentsnapshot.md#documentsnapshotid_property) |  | string |  |
|  [metadata](./firestore_.documentsnapshot.md#documentsnapshotmetadata_property) |  | [SnapshotMetadata](./firestore_.snapshotmetadata.md#snapshotmetadata_class) | Metadata about the <code>DocumentSnapshot</code>, including information about its source and local modifications. |
|  [ref](./firestore_.documentsnapshot.md#documentsnapshotref_property) |  | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [data(options)](./firestore_.documentsnapshot.md#documentsnapshotdata_method) |  | Retrieves all fields in the document as an <code>Object</code>. Returns <code>undefined</code> if the document doesn't exist.<!-- -->By default, <code>FieldValue.serverTimestamp()</code> values that have not yet been set to their final value will be returned as <code>null</code>. You can override this by passing an options object. |
|  [exists()](./firestore_.documentsnapshot.md#documentsnapshotexists_method) |  | Property of the <code>DocumentSnapshot</code> that signals whether or not the data exists. True if the document exists. |
|  [get(fieldPath, options)](./firestore_.documentsnapshot.md#documentsnapshotget_method) |  | Retrieves the field specified by <code>fieldPath</code>. Returns <code>undefined</code> if the document or field doesn't exist.<!-- -->By default, a <code>FieldValue.serverTimestamp()</code> that has not yet been set to its final value will be returned as <code>null</code>. You can override this by passing an options object. |

## DocumentSnapshot.(constructor)

Constructs a new instance of the `DocumentSnapshot` class

<b>Signature:</b>

```typescript
protected constructor();
```

## DocumentSnapshot.id property

<b>Signature:</b>

```typescript
get id(): string;
```

## DocumentSnapshot.metadata property

Metadata about the `DocumentSnapshot`<!-- -->, including information about its source and local modifications.

<b>Signature:</b>

```typescript
readonly metadata: SnapshotMetadata;
```

## DocumentSnapshot.ref property

<b>Signature:</b>

```typescript
get ref(): DocumentReference<T>;
```

## DocumentSnapshot.data() method

Retrieves all fields in the document as an `Object`<!-- -->. Returns `undefined` if the document doesn't exist.

By default, `FieldValue.serverTimestamp()` values that have not yet been set to their final value will be returned as `null`<!-- -->. You can override this by passing an options object.

<b>Signature:</b>

```typescript
data(options?: SnapshotOptions): T | undefined;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [SnapshotOptions](./firestore_.snapshotoptions.md#snapshotoptions_interface) | An options object to configure how data is retrieved from the snapshot (for example the desired behavior for server timestamps that have not yet been set to their final value). |

<b>Returns:</b>

T \| undefined

An `Object` containing all fields in the document or `undefined` if the document doesn't exist.

## DocumentSnapshot.exists() method

Property of the `DocumentSnapshot` that signals whether or not the data exists. True if the document exists.

<b>Signature:</b>

```typescript
exists(): this is QueryDocumentSnapshot<T>;
```
<b>Returns:</b>

this is [QueryDocumentSnapshot](./firestore_.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;T&gt;

## DocumentSnapshot.get() method

Retrieves the field specified by `fieldPath`<!-- -->. Returns `undefined` if the document or field doesn't exist.

By default, a `FieldValue.serverTimestamp()` that has not yet been set to its final value will be returned as `null`<!-- -->. You can override this by passing an options object.

<b>Signature:</b>

```typescript
get(fieldPath: string | FieldPath, options?: SnapshotOptions): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  fieldPath | string \| [FieldPath](./firestore_.fieldpath.md#fieldpath_class) | The path (for example 'foo' or 'foo.bar') to a specific field. |
|  options | [SnapshotOptions](./firestore_.snapshotoptions.md#snapshotoptions_interface) | An options object to configure how the field is retrieved from the snapshot (for example the desired behavior for server timestamps that have not yet been set to their final value). |

<b>Returns:</b>

any

The data at the specified field location or undefined if no such field exists in the document.

{% endblock body %}
