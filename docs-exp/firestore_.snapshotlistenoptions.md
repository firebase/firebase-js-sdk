{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## SnapshotListenOptions interface

An options object that can be passed to  and  to control which types of changes to include in the result set.

<b>Signature:</b>

```typescript
export declare interface SnapshotListenOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [includeMetadataChanges](./firestore_.snapshotlistenoptions.md#snapshotlistenoptionsincludemetadatachanges_property) | boolean | Include a change even if only the metadata of the query or of a document changed. Default is false. |

## SnapshotListenOptions.includeMetadataChanges property

Include a change even if only the metadata of the query or of a document changed. Default is false.

<b>Signature:</b>

```typescript
readonly includeMetadataChanges?: boolean;
```
{% endblock body %}
