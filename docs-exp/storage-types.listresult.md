{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ListResult interface

Result returned by list().

<b>Signature:</b>

```typescript
export interface ListResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [items](./storage-types.listresult.md#listresultitems_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface)<!-- -->\[\] | Objects in this directory. You can call getMetadata() and getDownloadUrl() on them. |
|  [nextPageToken](./storage-types.listresult.md#listresultnextpagetoken_property) | string | If set, there might be more results for this list. Use this token to resume the list. |
|  [prefixes](./storage-types.listresult.md#listresultprefixes_property) | [StorageReference](./storage-types.storagereference.md#storagereference_interface)<!-- -->\[\] | References to prefixes (sub-folders). You can call list() on them to get its contents.<!-- -->Folders are implicit based on '/' in the object paths. For example, if a bucket has two objects '/a/b/1' and '/a/b/2', list('/a') will return '/a/b' as a prefix. |

## ListResult.items property

Objects in this directory. You can call getMetadata() and getDownloadUrl() on them.

<b>Signature:</b>

```typescript
items: StorageReference[];
```

## ListResult.nextPageToken property

If set, there might be more results for this list. Use this token to resume the list.

<b>Signature:</b>

```typescript
nextPageToken?: string;
```

## ListResult.prefixes property

References to prefixes (sub-folders). You can call list() on them to get its contents.

Folders are implicit based on '/' in the object paths. For example, if a bucket has two objects '/a/b/1' and '/a/b/2', list('/a') will return '/a/b' as a prefix.

<b>Signature:</b>

```typescript
prefixes: StorageReference[];
```
{% endblock body %}
