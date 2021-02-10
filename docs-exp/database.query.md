{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## Query interface


<b>Signature:</b>

```typescript
export interface Query 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [ref](./database.query.md#queryref_property) | [Reference](./database.reference.md#reference_interface) |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [endAt(value, key)](./database.query.md#queryendat_method) |  |
|  [equalTo(value, key)](./database.query.md#queryequalto_method) |  |
|  [get()](./database.query.md#queryget_method) |  |
|  [isEqual(other)](./database.query.md#queryisequal_method) |  |
|  [limitToFirst(limit)](./database.query.md#querylimittofirst_method) |  |
|  [limitToLast(limit)](./database.query.md#querylimittolast_method) |  |
|  [off(eventType, callback, context)](./database.query.md#queryoff_method) |  |
|  [on(eventType, callback, cancelCallbackOrContext, context)](./database.query.md#queryon_method) |  |
|  [once(eventType, successCallback, failureCallbackOrContext, context)](./database.query.md#queryonce_method) |  |
|  [orderByChild(path)](./database.query.md#queryorderbychild_method) |  |
|  [orderByKey()](./database.query.md#queryorderbykey_method) |  |
|  [orderByPriority()](./database.query.md#queryorderbypriority_method) |  |
|  [orderByValue()](./database.query.md#queryorderbyvalue_method) |  |
|  [startAt(value, key)](./database.query.md#querystartat_method) |  |
|  [toJSON()](./database.query.md#querytojson_method) |  |
|  [toString()](./database.query.md#querytostring_method) |  |

## Query.ref property

<b>Signature:</b>

```typescript
ref: Reference;
```

## Query.endAt() method

<b>Signature:</b>

```typescript
endAt(value: number | string | boolean | null, key?: string): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | number \| string \| boolean \| null |  |
|  key | string |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.equalTo() method

<b>Signature:</b>

```typescript
equalTo(value: number | string | boolean | null, key?: string): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | number \| string \| boolean \| null |  |
|  key | string |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.get() method

<b>Signature:</b>

```typescript
get(): Promise<DataSnapshot>;
```
<b>Returns:</b>

Promise&lt;[DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->&gt;

## Query.isEqual() method

<b>Signature:</b>

```typescript
isEqual(other: Query | null): boolean;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  other | [Query](./database.query.md#query_interface) \| null |  |

<b>Returns:</b>

boolean

## Query.limitToFirst() method

<b>Signature:</b>

```typescript
limitToFirst(limit: number): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  limit | number |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.limitToLast() method

<b>Signature:</b>

```typescript
limitToLast(limit: number): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  limit | number |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.off() method

<b>Signature:</b>

```typescript
off(
    eventType?: EventType,
    callback?: (a: DataSnapshot, b?: string | null) => any,
    context?: object | null
  ): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  eventType | [EventType](./database.md#eventtype_type) |  |
|  callback | (a: [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->, b?: string \| null) =&gt; any |  |
|  context | object \| null |  |

<b>Returns:</b>

void

## Query.on() method

<b>Signature:</b>

```typescript
on(
    eventType: EventType,
    callback: (a: DataSnapshot, b?: string | null) => any,
    cancelCallbackOrContext?: ((a: Error) => any) | object | null,
    context?: object | null
  ): (a: DataSnapshot, b?: string | null) => any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  eventType | [EventType](./database.md#eventtype_type) |  |
|  callback | (a: [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->, b?: string \| null) =&gt; any |  |
|  cancelCallbackOrContext | ((a: Error) =&gt; any) \| object \| null |  |
|  context | object \| null |  |

<b>Returns:</b>

(a: [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->, b?: string \| null) =&gt; any

## Query.once() method

<b>Signature:</b>

```typescript
once(
    eventType: EventType,
    successCallback?: (a: DataSnapshot, b?: string | null) => any,
    failureCallbackOrContext?: ((a: Error) => void) | object | null,
    context?: object | null
  ): Promise<DataSnapshot>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  eventType | [EventType](./database.md#eventtype_type) |  |
|  successCallback | (a: [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->, b?: string \| null) =&gt; any |  |
|  failureCallbackOrContext | ((a: Error) =&gt; void) \| object \| null |  |
|  context | object \| null |  |

<b>Returns:</b>

Promise&lt;[DataSnapshot](./database.datasnapshot.md#datasnapshot_interface)<!-- -->&gt;

## Query.orderByChild() method

<b>Signature:</b>

```typescript
orderByChild(path: string): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | string |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.orderByKey() method

<b>Signature:</b>

```typescript
orderByKey(): Query;
```
<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.orderByPriority() method

<b>Signature:</b>

```typescript
orderByPriority(): Query;
```
<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.orderByValue() method

<b>Signature:</b>

```typescript
orderByValue(): Query;
```
<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.startAt() method

<b>Signature:</b>

```typescript
startAt(value: number | string | boolean | null, key?: string): Query;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  value | number \| string \| boolean \| null |  |
|  key | string |  |

<b>Returns:</b>

[Query](./database.query.md#query_interface)

## Query.toJSON() method

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

## Query.toString() method

<b>Signature:</b>

```typescript
toString(): string;
```
<b>Returns:</b>

string

{% endblock body %}
