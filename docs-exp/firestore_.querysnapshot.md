{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## QuerySnapshot class

A `QuerySnapshot` contains zero or more `DocumentSnapshot` objects representing the results of a query. The documents can be accessed as an array via the `docs` property or enumerated using the `forEach` method. The number of documents can be determined via the `empty` and `size` properties.

<b>Signature:</b>

```typescript
export declare class QuerySnapshot<T = DocumentData> 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [docs](./firestore_.querysnapshot.md#querysnapshotdocs_property) |  | Array&lt;[QueryDocumentSnapshot](./firestore_.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;T&gt;&gt; | An array of all the documents in the <code>QuerySnapshot</code>. |
|  [empty](./firestore_.querysnapshot.md#querysnapshotempty_property) |  | boolean | True if there are no documents in the <code>QuerySnapshot</code>. |
|  [metadata](./firestore_.querysnapshot.md#querysnapshotmetadata_property) |  | [SnapshotMetadata](./firestore_.snapshotmetadata.md#snapshotmetadata_class) | Metadata about this snapshot, concerning its source and if it has local modifications. |
|  [query](./firestore_.querysnapshot.md#querysnapshotquery_property) |  | [Query](./firestore_.query.md#query_class)<!-- -->&lt;T&gt; | The query on which you called <code>get</code> or <code>onSnapshot</code> in order to get this <code>QuerySnapshot</code>. |
|  [size](./firestore_.querysnapshot.md#querysnapshotsize_property) |  | number | The number of documents in the <code>QuerySnapshot</code>. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [docChanges(options)](./firestore_.querysnapshot.md#querysnapshotdocchanges_method) |  | Returns an array of the documents changes since the last snapshot. If this is the first snapshot, all documents will be in the list as 'added' changes. |
|  [forEach(callback, thisArg)](./firestore_.querysnapshot.md#querysnapshotforeach_method) |  | Enumerates all of the documents in the <code>QuerySnapshot</code>. |

## QuerySnapshot.docs property

An array of all the documents in the `QuerySnapshot`<!-- -->.

<b>Signature:</b>

```typescript
get docs(): Array<QueryDocumentSnapshot<T>>;
```

## QuerySnapshot.empty property

True if there are no documents in the `QuerySnapshot`<!-- -->.

<b>Signature:</b>

```typescript
get empty(): boolean;
```

## QuerySnapshot.metadata property

Metadata about this snapshot, concerning its source and if it has local modifications.

<b>Signature:</b>

```typescript
readonly metadata: SnapshotMetadata;
```

## QuerySnapshot.query property

The query on which you called `get` or `onSnapshot` in order to get this `QuerySnapshot`<!-- -->.

<b>Signature:</b>

```typescript
readonly query: Query<T>;
```

## QuerySnapshot.size property

The number of documents in the `QuerySnapshot`<!-- -->.

<b>Signature:</b>

```typescript
get size(): number;
```

## QuerySnapshot.docChanges() method

Returns an array of the documents changes since the last snapshot. If this is the first snapshot, all documents will be in the list as 'added' changes.

<b>Signature:</b>

```typescript
docChanges(options?: SnapshotListenOptions): Array<DocumentChange<T>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  options | [SnapshotListenOptions](./firestore_.snapshotlistenoptions.md#snapshotlistenoptions_interface) | <code>SnapshotListenOptions</code> that control whether metadata-only changes (i.e. only <code>DocumentSnapshot.metadata</code> changed) should trigger snapshot events. |

<b>Returns:</b>

Array&lt;[DocumentChange](./firestore_.documentchange.md#documentchange_interface)<!-- -->&lt;T&gt;&gt;

## QuerySnapshot.forEach() method

Enumerates all of the documents in the `QuerySnapshot`<!-- -->.

<b>Signature:</b>

```typescript
forEach(callback: (result: QueryDocumentSnapshot<T>) => void, thisArg?: unknown): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  callback | (result: [QueryDocumentSnapshot](./firestore_.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;T&gt;) =&gt; void | A callback to be called with a <code>QueryDocumentSnapshot</code> for each document in the snapshot. |
|  thisArg | unknown | The <code>this</code> binding for the callback. |

<b>Returns:</b>

void

{% endblock body %}
