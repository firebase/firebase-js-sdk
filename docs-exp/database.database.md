{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## Database interface


<b>Signature:</b>

```typescript
export interface Database 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [app](./database.database.md#databaseapp_property) | FirebaseApp |  |

## Methods

|  Method | Description |
|  --- | --- |
|  [goOffline()](./database.database.md#databasegooffline_method) |  |
|  [goOnline()](./database.database.md#databasegoonline_method) |  |
|  [ref(path)](./database.database.md#databaseref_method) |  |
|  [refFromURL(url)](./database.database.md#databasereffromurl_method) |  |
|  [useEmulator(host, port)](./database.database.md#databaseuseemulator_method) |  |

## Database.app property

<b>Signature:</b>

```typescript
app: FirebaseApp;
```

## Database.goOffline() method

<b>Signature:</b>

```typescript
goOffline(): void;
```
<b>Returns:</b>

void

## Database.goOnline() method

<b>Signature:</b>

```typescript
goOnline(): void;
```
<b>Returns:</b>

void

## Database.ref() method

<b>Signature:</b>

```typescript
ref(path?: string | Reference): Reference;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  path | string \| [Reference](./database.reference.md#reference_interface) |  |

<b>Returns:</b>

[Reference](./database.reference.md#reference_interface)

## Database.refFromURL() method

<b>Signature:</b>

```typescript
refFromURL(url: string): Reference;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  url | string |  |

<b>Returns:</b>

[Reference](./database.reference.md#reference_interface)

## Database.useEmulator() method

<b>Signature:</b>

```typescript
useEmulator(host: string, port: number): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  host | string |  |
|  port | number |  |

<b>Returns:</b>

void

{% endblock body %}
