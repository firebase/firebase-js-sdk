{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## FirestoreDataConverter interface

Converter used by `withConverter()` to transform user objects of type `T` into Firestore data.

Using the converter allows you to specify generic type arguments when storing and retrieving objects from Firestore.

<b>Signature:</b>

```typescript
export declare interface FirestoreDataConverter<T> 
```

## Example


```typescript
class Post {
  constructor(readonly title: string, readonly author: string) {}

  toString(): string {
    return this.title + ', by ' + this.author;
  }
}

const postConverter = {
  toFirestore(post: Post): firebase.firestore.DocumentData {
    return {title: post.title, author: post.author};
  },
  fromFirestore(
    snapshot: firebase.firestore.QueryDocumentSnapshot,
    options: firebase.firestore.SnapshotOptions
  ): Post {
    const data = snapshot.data(options)!;
    return new Post(data.title, data.author);
  }
};

const postSnap = await firebase.firestore()
  .collection('posts')
  .withConverter(postConverter)
  .doc().get();
const post = postSnap.data();
if (post !== undefined) {
  post.title; // string
  post.toString(); // Should be defined
  post.someNonExistentProperty; // TS error
}

```

## Methods

|  Method | Description |
|  --- | --- |
|  [fromFirestore(snapshot, options)](./firestore_.firestoredataconverter.md#firestoredataconverterfromfirestore_method) | Called by the Firestore SDK to convert Firestore data into an object of type T. You can access your data by calling: <code>snapshot.data(options)</code>. |
|  [toFirestore(modelObject)](./firestore_.firestoredataconverter.md#firestoredataconvertertofirestore_method) | Called by the Firestore SDK to convert a custom model object of type <code>T</code> into a plain JavaScript object (suitable for writing directly to the Firestore database). To use <code>set()</code> with <code>merge</code> and <code>mergeFields</code>, <code>toFirestore()</code> must be defined with <code>Partial&lt;T&gt;</code>. |
|  [toFirestore(modelObject, options)](./firestore_.firestoredataconverter.md#firestoredataconvertertofirestore_method) | Called by the Firestore SDK to convert a custom model object of type <code>T</code> into a plain JavaScript object (suitable for writing directly to the Firestore database). Used with ,  and  with <code>merge:true</code> or <code>mergeFields</code>. |

## FirestoreDataConverter.fromFirestore() method

Called by the Firestore SDK to convert Firestore data into an object of type T. You can access your data by calling: `snapshot.data(options)`<!-- -->.

<b>Signature:</b>

```typescript
fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>, options?: SnapshotOptions): T;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  snapshot | [QueryDocumentSnapshot](./firestore_.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;[DocumentData](./firestore_.documentdata.md#documentdata_interface)<!-- -->&gt; | A <code>QueryDocumentSnapshot</code> containing your data and metadata. |
|  options | [SnapshotOptions](./firestore_.snapshotoptions.md#snapshotoptions_interface) | The <code>SnapshotOptions</code> from the initial call to <code>data()</code>. |

<b>Returns:</b>

T

## FirestoreDataConverter.toFirestore() method

Called by the Firestore SDK to convert a custom model object of type `T` into a plain JavaScript object (suitable for writing directly to the Firestore database). To use `set()` with `merge` and `mergeFields`<!-- -->, `toFirestore()` must be defined with `Partial<T>`<!-- -->.

<b>Signature:</b>

```typescript
toFirestore(modelObject: T): DocumentData;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelObject | T |  |

<b>Returns:</b>

[DocumentData](./firestore_.documentdata.md#documentdata_interface)

## FirestoreDataConverter.toFirestore() method

Called by the Firestore SDK to convert a custom model object of type `T` into a plain JavaScript object (suitable for writing directly to the Firestore database). Used with ,  and  with `merge:true` or `mergeFields`<!-- -->.

<b>Signature:</b>

```typescript
toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelObject | Partial&lt;T&gt; |  |
|  options | [SetOptions](./firestore_.md#setoptions_type) |  |

<b>Returns:</b>

[DocumentData](./firestore_.documentdata.md#documentdata_interface)

{% endblock body %}
