{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UploadTaskSnapshot interface

Holds data about the current state of the upload task.

<b>Signature:</b>

```typescript
export interface UploadTaskSnapshot 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [bytesTransferred](./storage-types.uploadtasksnapshot.md#uploadtasksnapshotbytestransferred_property) | number | The number of bytes that have been successfully uploaded so far. |
|  [metadata](./storage-types.uploadtasksnapshot.md#uploadtasksnapshotmetadata_property) | [FullMetadata](./storage-types.fullmetadata.md#fullmetadata_interface) | Before the upload completes, contains the metadata sent to the server. After the upload completes, contains the metadata sent back from the server. |
|  [ref](./storage-types.uploadtasksnapshot.md#uploadtasksnapshotref_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface) | The reference that spawned this snapshot's upload task. |
|  [state](./storage-types.uploadtasksnapshot.md#uploadtasksnapshotstate_property) | [TaskState](./storage-types.md#taskstate_type) | The current state of the task. |
|  [task](./storage-types.uploadtasksnapshot.md#uploadtasksnapshottask_property) | [UploadTask](./storage-types.uploadtask.md#uploadtask_interface) | The task of which this is a snapshot. |
|  [totalBytes](./storage-types.uploadtasksnapshot.md#uploadtasksnapshottotalbytes_property) | number | The total number of bytes to be uploaded. |

## UploadTaskSnapshot.bytesTransferred property

The number of bytes that have been successfully uploaded so far.

<b>Signature:</b>

```typescript
bytesTransferred: number;
```

## UploadTaskSnapshot.metadata property

Before the upload completes, contains the metadata sent to the server. After the upload completes, contains the metadata sent back from the server.

<b>Signature:</b>

```typescript
metadata: FullMetadata;
```

## UploadTaskSnapshot.ref property

The reference that spawned this snapshot's upload task.

<b>Signature:</b>

```typescript
ref: StorageReference;
```

## UploadTaskSnapshot.state property

The current state of the task.

<b>Signature:</b>

```typescript
state: TaskState;
```

## UploadTaskSnapshot.task property

The task of which this is a snapshot.

<b>Signature:</b>

```typescript
task: UploadTask;
```

## UploadTaskSnapshot.totalBytes property

The total number of bytes to be uploaded.

<b>Signature:</b>

```typescript
totalBytes: number;
```
{% endblock body %}
