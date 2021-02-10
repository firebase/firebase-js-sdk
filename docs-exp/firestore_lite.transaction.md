{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## Transaction class

A reference to a transaction.

The `Transaction` object passed to a transaction's `updateFunction` provides the methods to read and write data within the transaction context. See [runTransaction()](./firestore_.md#runtransaction_function)<!-- -->.

<b>Signature:</b>

```typescript
export declare class Transaction 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [delete(documentRef)](./firestore_lite.transaction.md#transactiondelete_method) |  | Deletes the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. |
|  [get(documentRef)](./firestore_lite.transaction.md#transactionget_method) |  | Reads the document referenced by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. |
|  [set(documentRef, data)](./firestore_lite.transaction.md#transactionset_method) |  | Writes to the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. If the document does not exist yet, it will be created. |
|  [set(documentRef, data, options)](./firestore_lite.transaction.md#transactionset_method) |  | Writes to the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. If the document does not exist yet, it will be created. If you provide <code>merge</code> or <code>mergeFields</code>, the provided data can be merged into an existing document. |
|  [update(documentRef, data)](./firestore_lite.transaction.md#transactionupdate_method) |  | Updates fields in the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. The update will fail if applied to a document that does not exist. |
|  [update(documentRef, field, value, moreFieldsAndValues)](./firestore_lite.transaction.md#transactionupdate_method) |  | Updates fields in the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. The update will fail if applied to a document that does not exist.<!-- -->Nested fields can be updated by providing dot-separated field path strings or by providing <code>FieldPath</code> objects. |

## Transaction.delete() method

Deletes the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->.

<b>Signature:</b>

```typescript
delete(documentRef: DocumentReference<unknown>): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; | A reference to the document to be deleted. |

<b>Returns:</b>

this

This `Transaction` instance. Used for chaining method calls.

## Transaction.get() method

Reads the document referenced by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->.

<b>Signature:</b>

```typescript
get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; | A reference to the document to be read. |

<b>Returns:</b>

Promise&lt;[DocumentSnapshot](./firestore_lite.documentsnapshot.md#documentsnapshot_class)<!-- -->&lt;T&gt;&gt;

A `DocumentSnapshot` with the read data.

## Transaction.set() method

Writes to the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. If the document does not exist yet, it will be created.

<b>Signature:</b>

```typescript
set<T>(documentRef: DocumentReference<T>, data: T): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; | A reference to the document to be set. |
|  data | T | An object of the fields and values for the document. |

<b>Returns:</b>

this

This `Transaction` instance. Used for chaining method calls.

## Transaction.set() method

Writes to the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. If the document does not exist yet, it will be created. If you provide `merge` or `mergeFields`<!-- -->, the provided data can be merged into an existing document.

<b>Signature:</b>

```typescript
set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options: SetOptions): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; | A reference to the document to be set. |
|  data | Partial&lt;T&gt; | An object of the fields and values for the document. |
|  options | [SetOptions](./firestore_lite.md#setoptions_type) | An object to configure the set behavior. |

<b>Returns:</b>

this

This `Transaction` instance. Used for chaining method calls.

## Transaction.update() method

Updates fields in the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. The update will fail if applied to a document that does not exist.

<b>Signature:</b>

```typescript
update(documentRef: DocumentReference<unknown>, data: UpdateData): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; | A reference to the document to be updated. |
|  data | [UpdateData](./firestore_lite.updatedata.md#updatedata_interface) | An object containing the fields and values with which to update the document. Fields can contain dots to reference nested fields within the document. |

<b>Returns:</b>

this

This `Transaction` instance. Used for chaining method calls.

## Transaction.update() method

Updates fields in the document referred to by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. The update will fail if applied to a document that does not exist.

Nested fields can be updated by providing dot-separated field path strings or by providing `FieldPath` objects.

<b>Signature:</b>

```typescript
update(documentRef: DocumentReference<unknown>, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_lite.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; | A reference to the document to be updated. |
|  field | string \| [FieldPath](./firestore_lite.fieldpath.md#fieldpath_class) | The first field to update. |
|  value | unknown | The first value. |
|  moreFieldsAndValues | unknown\[\] | Additional key/value pairs. |

<b>Returns:</b>

this

This `Transaction` instance. Used for chaining method calls.

{% endblock body %}
