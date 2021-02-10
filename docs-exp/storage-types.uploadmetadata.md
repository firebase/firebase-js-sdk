{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## UploadMetadata interface

Object metadata that can be set at upload.

<b>Signature:</b>

```typescript
export interface UploadMetadata extends SettableMetadata 
```
<b>Extends:</b> [SettableMetadata](./storage-types.settablemetadata.md#settablemetadata_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [md5Hash](./storage-types.uploadmetadata.md#uploadmetadatamd5hash_property) | string \| undefined | A Base64-encoded MD5 hash of the object being uploaded. |

## UploadMetadata.md5Hash property

A Base64-encoded MD5 hash of the object being uploaded.

<b>Signature:</b>

```typescript
md5Hash?: string | undefined;
```
{% endblock body %}
