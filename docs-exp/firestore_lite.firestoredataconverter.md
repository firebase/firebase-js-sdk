{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
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
  fromFirestore(snapshot: firebase.firestore.QueryDocumentSnapshot): Post {
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
|  [fromFirestore(snapshot)](./firestore_lite.firestoredataconverter.md#firestoredataconverterfromfirestore_method) | Called by the Firestore SDK to convert Firestore data into an object of type T. You can access your data by calling: <code>snapshot.data()</code>. |
|  [toFirestore(modelObject)](./firestore_lite.firestoredataconverter.md#firestoredataconvertertofirestore_method) | Called by the Firestore SDK to convert a custom model object of type <code>T</code> into a plain Javascript object (suitable for writing directly to the Firestore database). Used with ,  and . |
|  [toFirestore(modelObject, options)](./firestore_lite.firestoredataconverter.md#firestoredataconvertertofirestore_method) | Called by the Firestore SDK to convert a custom model object of type <code>T</code> into a plain Javascript object (suitable for writing directly to the Firestore database). Used with ,  and  with <code>merge:true</code> or <code>mergeFields</code>. |

## FirestoreDataConverter.fromFirestore() method

Called by the Firestore SDK to convert Firestore data into an object of type T. You can access your data by calling: `snapshot.data()`<!-- -->.

<b>Signature:</b>

```typescript
fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): T;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  snapshot | [QueryDocumentSnapshot](./firestore_lite.querydocumentsnapshot.md#querydocumentsnapshot_class)<!-- -->&lt;[DocumentData](./firestore_lite.documentdata.md#documentdata_interface)<!-- -->&gt; | A <code>QueryDocumentSnapshot</code> containing your data and metadata. |

<b>Returns:</b>

T

## FirestoreDataConverter.toFirestore() method

Called by the Firestore SDK to convert a custom model object of type `T` into a plain Javascript object (suitable for writing directly to the Firestore database). Used with ,  and .

<b>Signature:</b>

```typescript
toFirestore(modelObject: T): DocumentData;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelObject | T |  |

<b>Returns:</b>

[DocumentData](./firestore_lite.documentdata.md#documentdata_interface)

## FirestoreDataConverter.toFirestore() method

Called by the Firestore SDK to convert a custom model object of type `T` into a plain Javascript object (suitable for writing directly to the Firestore database). Used with ,  and  with `merge:true` or `mergeFields`<!-- -->.

<b>Signature:</b>

```typescript
toFirestore(modelObject: Partial<T>, options: SetOptions): DocumentData;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  modelObject | Partial&lt;T&gt; |  |
|  options | [SetOptions](./firestore_lite.md#setoptions_type) |  |

<b>Returns:</b>

[DocumentData](./firestore_lite.documentdata.md#documentdata_interface)

{% endblock body %}
