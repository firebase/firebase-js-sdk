{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## database package

## Functions

|  Function | Description |
|  --- | --- |
|  [enableLogging(logger, persistent)](./database.md#enablelogging_function) |  |
|  [getDatabase(app, url)](./database.md#getdatabase_function) |  |

## Interfaces

|  Interface | Description |
|  --- | --- |
|  [Database](./database.database.md#database_interface) |  |
|  [DataSnapshot](./database.datasnapshot.md#datasnapshot_interface) |  |
|  [OnDisconnect](./database.ondisconnect.md#ondisconnect_interface) |  |
|  [Query](./database.query.md#query_interface) |  |
|  [Reference](./database.reference.md#reference_interface) |  |
|  [ThenableReference](./database.thenablereference.md#thenablereference_interface) |  |

## Variables

|  Variable | Description |
|  --- | --- |
|  [ServerValue](./database.md#servervalue_variable) |  |

## Type Aliases

|  Type Alias | Description |
|  --- | --- |
|  [EventType](./database.md#eventtype_type) |  |

## enableLogging() function


<b>Signature:</b>

```typescript
export function enableLogging(
  logger?: boolean | ((a: string) => any),
  persistent?: boolean
): any;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  logger | boolean \| ((a: string) =&gt; any) |  |
|  persistent | boolean |  |

<b>Returns:</b>

any

## getDatabase() function


<b>Signature:</b>

```typescript
export declare function getDatabase(app: FirebaseApp, url?: string): Database;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  app | FirebaseApp |  |
|  url | string |  |

<b>Returns:</b>

[Database](./database.database.md#database_interface)

## ServerValue variable


<b>Signature:</b>

```typescript
ServerValue: {
  TIMESTAMP: object;
  increment(delta: number): object;
}
```

## EventType type


<b>Signature:</b>

```typescript
type EventType =
  | 'value'
  | 'child_added'
  | 'child_changed'
  | 'child_moved'
  | 'child_removed';
```
{% endblock body %}
