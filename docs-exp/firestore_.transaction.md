{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

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
|  [delete(documentRef)](./firestore_.transaction.md#transactiondelete_method) |  |  |
|  [get(documentRef)](./firestore_.transaction.md#transactionget_method) |  | Reads the document referenced by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->. |
|  [set(documentRef, data)](./firestore_.transaction.md#transactionset_method) |  |  |
|  [set(documentRef, data, options)](./firestore_.transaction.md#transactionset_method) |  |  |
|  [update(documentRef, data)](./firestore_.transaction.md#transactionupdate_method) |  |  |
|  [update(documentRef, field, value, moreFieldsAndValues)](./firestore_.transaction.md#transactionupdate_method) |  |  |

## Transaction.delete() method

<b>Signature:</b>

```typescript
delete(documentRef: DocumentReference<unknown>): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; |  |

<b>Returns:</b>

this

## Transaction.get() method

Reads the document referenced by the provided [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->.

<b>Signature:</b>

```typescript
get<T>(documentRef: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; | A reference to the document to be read. |

<b>Returns:</b>

Promise&lt;[DocumentSnapshot](./firestore_.documentsnapshot.md#documentsnapshot_class)<!-- -->&lt;T&gt;&gt;

A `DocumentSnapshot` with the read data.

## Transaction.set() method

<b>Signature:</b>

```typescript
set<T>(documentRef: DocumentReference<T>, data: T): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; |  |
|  data | T |  |

<b>Returns:</b>

this

## Transaction.set() method

<b>Signature:</b>

```typescript
set<T>(documentRef: DocumentReference<T>, data: Partial<T>, options: SetOptions): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;T&gt; |  |
|  data | Partial&lt;T&gt; |  |
|  options | [SetOptions](./firestore_.md#setoptions_type) |  |

<b>Returns:</b>

this

## Transaction.update() method

<b>Signature:</b>

```typescript
update(documentRef: DocumentReference<unknown>, data: UpdateData): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; |  |
|  data | [UpdateData](./firestore_.updatedata.md#updatedata_interface) |  |

<b>Returns:</b>

this

## Transaction.update() method

<b>Signature:</b>

```typescript
update(documentRef: DocumentReference<unknown>, field: string | FieldPath, value: unknown, ...moreFieldsAndValues: unknown[]): this;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  documentRef | [DocumentReference](./firestore_.documentreference.md#documentreference_class)<!-- -->&lt;unknown&gt; |  |
|  field | string \| [FieldPath](./firestore_.fieldpath.md#fieldpath_class) |  |
|  value | unknown |  |
|  moreFieldsAndValues | unknown\[\] |  |

<b>Returns:</b>

this

{% endblock body %}
