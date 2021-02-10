{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## FullMetadata interface

The full set of object metadata, including read-only properties.

<b>Signature:</b>

```typescript
export interface FullMetadata extends UploadMetadata 
```
<b>Extends:</b> [UploadMetadata](./storage-types.uploadmetadata.md#uploadmetadata_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [bucket](./storage-types.fullmetadata.md#fullmetadatabucket_property) | string | The bucket this object is contained in. |
|  [downloadTokens](./storage-types.fullmetadata.md#fullmetadatadownloadtokens_property) | string\[\] \| undefined | Tokens to allow access to the downloatd URL. |
|  [fullPath](./storage-types.fullmetadata.md#fullmetadatafullpath_property) | string | The full path of this object. |
|  [generation](./storage-types.fullmetadata.md#fullmetadatageneration_property) | string | The object's generation. [https://cloud.google.com/storage/docs/generations-preconditions](https://cloud.google.com/storage/docs/generations-preconditions) |
|  [metageneration](./storage-types.fullmetadata.md#fullmetadatametageneration_property) | string | The object's metageneration. [https://cloud.google.com/storage/docs/generations-preconditions](https://cloud.google.com/storage/docs/generations-preconditions) |
|  [name](./storage-types.fullmetadata.md#fullmetadataname_property) | string | The short name of this object, which is the last component of the full path. For example, if fullPath is 'full/path/image.png', name is 'image.png'. |
|  [ref](./storage-types.fullmetadata.md#fullmetadataref_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface) \| undefined | <code>StorageReference</code> associated with this upload. |
|  [size](./storage-types.fullmetadata.md#fullmetadatasize_property) | number | The size of this object, in bytes. |
|  [timeCreated](./storage-types.fullmetadata.md#fullmetadatatimecreated_property) | string | A date string representing when this object was created. |
|  [updated](./storage-types.fullmetadata.md#fullmetadataupdated_property) | string | A date string representing when this object was last updated. |

## FullMetadata.bucket property

The bucket this object is contained in.

<b>Signature:</b>

```typescript
bucket: string;
```

## FullMetadata.downloadTokens property

Tokens to allow access to the downloatd URL.

<b>Signature:</b>

```typescript
downloadTokens: string[] | undefined;
```

## FullMetadata.fullPath property

The full path of this object.

<b>Signature:</b>

```typescript
fullPath: string;
```

## FullMetadata.generation property

The object's generation. [https://cloud.google.com/storage/docs/generations-preconditions](https://cloud.google.com/storage/docs/generations-preconditions)

<b>Signature:</b>

```typescript
generation: string;
```

## FullMetadata.metageneration property

The object's metageneration. [https://cloud.google.com/storage/docs/generations-preconditions](https://cloud.google.com/storage/docs/generations-preconditions)

<b>Signature:</b>

```typescript
metageneration: string;
```

## FullMetadata.name property

The short name of this object, which is the last component of the full path. For example, if fullPath is 'full/path/image.png', name is 'image.png'.

<b>Signature:</b>

```typescript
name: string;
```

## FullMetadata.ref property

`StorageReference` associated with this upload.

<b>Signature:</b>

```typescript
ref?: StorageReference | undefined;
```

## FullMetadata.size property

The size of this object, in bytes.

<b>Signature:</b>

```typescript
size: number;
```

## FullMetadata.timeCreated property

A date string representing when this object was created.

<b>Signature:</b>

```typescript
timeCreated: string;
```

## FullMetadata.updated property

A date string representing when this object was last updated.

<b>Signature:</b>

```typescript
updated: string;
```
{% endblock body %}
