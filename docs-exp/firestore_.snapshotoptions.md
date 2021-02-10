{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## SnapshotOptions interface

Options that configure how data is retrieved from a `DocumentSnapshot` (for example the desired behavior for server timestamps that have not yet been set to their final value).

<b>Signature:</b>

```typescript
export declare interface SnapshotOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [serverTimestamps](./firestore_.snapshotoptions.md#snapshotoptionsservertimestamps_property) | 'estimate' \| 'previous' \| 'none' | If set, controls the return value for server timestamps that have not yet been set to their final value.<!-- -->By specifying 'estimate', pending server timestamps return an estimate based on the local clock. This estimate will differ from the final value and cause these values to change once the server result becomes available.<!-- -->By specifying 'previous', pending timestamps will be ignored and return their previous value instead.<!-- -->If omitted or set to 'none', <code>null</code> will be returned by default until the server value becomes available. |

## SnapshotOptions.serverTimestamps property

If set, controls the return value for server timestamps that have not yet been set to their final value.

By specifying 'estimate', pending server timestamps return an estimate based on the local clock. This estimate will differ from the final value and cause these values to change once the server result becomes available.

By specifying 'previous', pending timestamps will be ignored and return their previous value instead.

If omitted or set to 'none', `null` will be returned by default until the server value becomes available.

<b>Signature:</b>

```typescript
readonly serverTimestamps?: 'estimate' | 'previous' | 'none';
```
{% endblock body %}
