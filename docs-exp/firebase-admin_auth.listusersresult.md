{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ListUsersResult interface

Interface representing the object returned from a  operation. Contains the list of users for the current batch and the next page token if available.

<b>Signature:</b>

```typescript
export interface ListUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [pageToken](./firebase-admin_auth.listusersresult.md#listusersresultpagetoken_property) | string | The next page token if available. This is needed for the next batch download. |
|  [users](./firebase-admin_auth.listusersresult.md#listusersresultusers_property) | [UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->\[\] | The list of  objects for the current downloaded batch. |

## ListUsersResult.pageToken property

The next page token if available. This is needed for the next batch download.

<b>Signature:</b>

```typescript
pageToken?: string;
```

## ListUsersResult.users property

The list of  objects for the current downloaded batch.

<b>Signature:</b>

```typescript
users: UserRecord[];
```
{% endblock body %}
