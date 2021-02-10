{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ListOptions interface

The options `list()` accepts.

<b>Signature:</b>

```typescript
export interface ListOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [maxResults](./storage-types.listoptions.md#listoptionsmaxresults_property) | number \| null | If set, limits the total number of <code>prefixes</code> and <code>items</code> to return. The default and maximum maxResults is 1000. |
|  [pageToken](./storage-types.listoptions.md#listoptionspagetoken_property) | string \| null | The <code>nextPageToken</code> from a previous call to <code>list()</code>. If provided, listing is resumed from the previous position. |

## ListOptions.maxResults property

If set, limits the total number of `prefixes` and `items` to return. The default and maximum maxResults is 1000.

<b>Signature:</b>

```typescript
maxResults?: number | null;
```

## ListOptions.pageToken property

The `nextPageToken` from a previous call to `list()`<!-- -->. If provided, listing is resumed from the previous position.

<b>Signature:</b>

```typescript
pageToken?: string | null;
```
{% endblock body %}
