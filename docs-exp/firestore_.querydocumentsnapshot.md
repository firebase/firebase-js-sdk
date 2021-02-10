{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## QueryDocumentSnapshot class

A `QueryDocumentSnapshot` contains data read from a document in your Firestore database as part of a query. The document is guaranteed to exist and its data can be extracted with `.data()` or `.get(<field>)` to get a specific field.

A `QueryDocumentSnapshot` offers the same API surface as a `DocumentSnapshot`<!-- -->. Since query results contain only existing documents, the `exists` property will always be true and `data()` will never return 'undefined'.

<b>Signature:</b>

```typescript
export declare class QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> 
```
<b>Extends:</b> [DocumentSnapshot](./firestore_.documentsnapshot.md#documentsnapshot_class)<!-- -->&lt;T&gt;

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [data(options)](./firestore_.querydocumentsnapshot.md#querydocumentsnapshotdata_method) |  | Retrieves all fields in the document as an <code>Object</code>.<!-- -->By default, <code>FieldValue.serverTimestamp()</code> values that have not yet been set to their final value will be returned as <code>null</code>. You can override this by passing an options object. |

## QueryDocumentSnapshot.data() method

Retrieves all fields in the document as an `Object`<!-- -->.

By default, `FieldValue.serverTimestamp()` values that have not yet been set to their final value will be returned as `null`<!-- -->. You can override this by passing an options object.

<b>Signature:</b>

```typescript
/** @override */
data(options?: SnapshotOptions): T;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [SnapshotOptions](./firestore_.snapshotoptions.md#snapshotoptions_interface) | An options object to configure how data is retrieved from the snapshot (for example the desired behavior for server timestamps that have not yet been set to their final value). |

<b>Returns:</b>

T

An `Object` containing all fields in the document.

{% endblock body %}
