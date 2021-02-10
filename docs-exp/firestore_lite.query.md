{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Query class

A `Query` refers to a Query which you can read or listen to. You can also construct refined `Query` objects by adding filters and ordering.

<b>Signature:</b>

```typescript
export declare class Query<T = DocumentData> 
```

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)()](./firestore_lite.query.md#queryconstructor) |  | Constructs a new instance of the <code>Query</code> class |

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [firestore](./firestore_lite.query.md#queryfirestore_property) |  | [FirebaseFirestore](./firestore_lite.firebasefirestore.md#firebasefirestore_class) | The <code>FirebaseFirestore</code> for the Firestore database (useful for performing transactions, etc.). |
|  [type](./firestore_lite.query.md#querytype_property) |  | 'query' \| 'collection' | The type of this Firestore reference. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [withConverter(converter)](./firestore_lite.query.md#querywithconverter_method) |  | Applies a custom data converter to this query, allowing you to use your own custom model objects with Firestore. When you call [getDocs()](./firestore_.md#getdocs_function) with the returned query, the provided converter will convert between Firestore data and your custom type <code>U</code>. |

## Query.(constructor)

Constructs a new instance of the `Query` class

<b>Signature:</b>

```typescript
protected constructor();
```

## Query.firestore property

The `FirebaseFirestore` for the Firestore database (useful for performing transactions, etc.).

<b>Signature:</b>

```typescript
readonly firestore: FirebaseFirestore;
```

## Query.type property

The type of this Firestore reference.

<b>Signature:</b>

```typescript
readonly type: 'query' | 'collection';
```

## Query.withConverter() method

Applies a custom data converter to this query, allowing you to use your own custom model objects with Firestore. When you call [getDocs()](./firestore_.md#getdocs_function) with the returned query, the provided converter will convert between Firestore data and your custom type `U`<!-- -->.

<b>Signature:</b>

```typescript
withConverter<U>(converter: FirestoreDataConverter<U>): Query<U>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  converter | [FirestoreDataConverter](./firestore_lite.firestoredataconverter.md#firestoredataconverter_interface)<!-- -->&lt;U&gt; | Converts objects to and from Firestore. |

<b>Returns:</b>

[Query](./firestore_lite.query.md#query_class)<!-- -->&lt;U&gt;

A `Query<U>` that uses the provided converter.

{% endblock body %}
