{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## StorageReference interface

Represents a reference to a Google Cloud Storage object. Developers can upload, download, and delete objects, as well as get/set object metadata.

<b>Signature:</b>

```typescript
export interface StorageReference 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [bucket](./storage-types.storagereference.md#storagereferencebucket_property) | string | The name of the bucket containing this reference's object. |
|  [fullPath](./storage-types.storagereference.md#storagereferencefullpath_property) | string | The full path of this object. |
|  [name](./storage-types.storagereference.md#storagereferencename_property) | string | The short name of this object, which is the last component of the full path. For example, if fullPath is 'full/path/image.png', name is 'image.png'. |
|  [parent](./storage-types.storagereference.md#storagereferenceparent_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface) \| null | A reference pointing to the parent location of this reference, or null if this reference is the root. |
|  [root](./storage-types.storagereference.md#storagereferenceroot_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface) | A reference to the root of this object's bucket. |
|  [storage](./storage-types.storagereference.md#storagereferencestorage_property) | [StorageService](./storage-types.storageservice.md#storageservice_interface) | The StorageService associated with this reference. |

## Methods

|  Method | Description |
|  --- | --- |
|  [toString()](./storage-types.storagereference.md#storagereferencetostring_method) | Returns a gs:// URL for this object in the form <code>gs://&lt;bucket&gt;/&lt;path&gt;/&lt;to&gt;/&lt;object&gt;</code> |

## StorageReference.bucket property

The name of the bucket containing this reference's object.

<b>Signature:</b>

```typescript
bucket: string;
```

## StorageReference.fullPath property

The full path of this object.

<b>Signature:</b>

```typescript
fullPath: string;
```

## StorageReference.name property

The short name of this object, which is the last component of the full path. For example, if fullPath is 'full/path/image.png', name is 'image.png'.

<b>Signature:</b>

```typescript
name: string;
```

## StorageReference.parent property

A reference pointing to the parent location of this reference, or null if this reference is the root.

<b>Signature:</b>

```typescript
parent: StorageReference | null;
```

## StorageReference.root property

A reference to the root of this object's bucket.

<b>Signature:</b>

```typescript
root: StorageReference;
```

## StorageReference.storage property

The StorageService associated with this reference.

<b>Signature:</b>

```typescript
storage: StorageService;
```

## StorageReference.toString() method

Returns a gs:// URL for this object in the form `gs://<bucket>/<path>/<to>/<object>`

<b>Signature:</b>

```typescript
toString(): string;
```
<b>Returns:</b>

string

The gs:// URL.

{% endblock body %}
