{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## UploadResult interface

Result returned from a non-resumable upload.

<b>Signature:</b>

```typescript
export interface UploadResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [metadata](./storage-types.uploadresult.md#uploadresultmetadata_property) | [FullMetadata](./storage-types.fullmetadata.md#fullmetadata_interface) | Contains the metadata sent back from the server. |
|  [ref](./storage-types.uploadresult.md#uploadresultref_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface) | The reference that spawned this upload. |

## UploadResult.metadata property

Contains the metadata sent back from the server.

<b>Signature:</b>

```typescript
readonly metadata: FullMetadata;
```

## UploadResult.ref property

The reference that spawned this upload.

<b>Signature:</b>

```typescript
readonly ref: StorageReference;
```
{% endblock body %}
