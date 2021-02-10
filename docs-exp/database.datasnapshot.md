{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## DataSnapshot interface


<b>Signature:</b>

```typescript
export interface DataSnapshot 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [key](./database.datasnapshot.md#datasnapshotkey_property) | string \| null |  |
|  [ref](./database.datasnapshot.md#datasnapshotref_property) | [Reference](./database.reference.md#reference_interface) |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [child(path)](./database.datasnapshot.md#datasnapshotchild_method) |  |
|  [exists()](./database.datasnapshot.md#datasnapshotexists_method) |  |
|  [exportVal()](./database.datasnapshot.md#datasnapshotexportval_method) |  |
|  [forEach(action)](./database.datasnapshot.md#datasnapshotforeach_method) |  |
|  [getPriority()](./database.datasnapshot.md#datasnapshotgetpriority_method) |  |
|  [hasChild(path)](./database.datasnapshot.md#datasnapshothaschild_method) |  |
|  [hasChildren()](./database.datasnapshot.md#datasnapshothaschildren_method) |  |
|  [numChildren()](./database.datasnapshot.md#datasnapshotnumchildren_method) |  |
|  [toJSON()](./database.datasnapshot.md#datasnapshottojson_method) |  |
|  [val()](./database.datasnapshot.md#datasnapshotval_method) |  |

## DataSnapshot.key property

<b>Signature:</b>

```typescript
key: string | null;
```

## DataSnapshot.ref property

<b>Signature:</b>

```typescript
ref: Reference;
```

## DataSnapshot.child() method

<b>Signature:</b>

```typescript
child(path: string): DataSnapshot;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | string |  |

<b>Returns:</b>

[DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)

## DataSnapshot.exists() method

<b>Signature:</b>

```typescript
exists(): boolean;
```
<b>Returns:</b>

boolean

## DataSnapshot.exportVal() method

<b>Signature:</b>

```typescript
exportVal(): any;
```
<b>Returns:</b>

any

## DataSnapshot.forEach() method

<b>Signature:</b>

```typescript
forEach(action: (a: DataSnapshot) => boolean | void): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  action | (a: [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->) =&gt; boolean \| void |  |

<b>Returns:</b>

boolean

## DataSnapshot.getPriority() method

<b>Signature:</b>

```typescript
getPriority(): string | number | null;
```
<b>Returns:</b>

string \| number \| null

## DataSnapshot.hasChild() method

<b>Signature:</b>

```typescript
hasChild(path: string): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | string |  |

<b>Returns:</b>

boolean

## DataSnapshot.hasChildren() method

<b>Signature:</b>

```typescript
hasChildren(): boolean;
```
<b>Returns:</b>

boolean

## DataSnapshot.numChildren() method

<b>Signature:</b>

```typescript
numChildren(): number;
```
<b>Returns:</b>

number

## DataSnapshot.toJSON() method

<b>Signature:</b>

```typescript
toJSON(): object | null;
```
<b>Returns:</b>

object \| null

## DataSnapshot.val() method

<b>Signature:</b>

```typescript
val(): any;
```
<b>Returns:</b>

any

{% endblock body %}
