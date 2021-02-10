{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## GetUsersResult interface

Represents the result of the  API.

<b>Signature:</b>

```typescript
export interface GetUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [notFound](./firebase-admin_.getusersresult.md#getusersresultnotfound_property) | [UserIdentifier](./firebase-admin_.md#useridentifier_type)<!-- -->\[\] | Set of identifiers that were requested, but not found. |
|  [users](./firebase-admin_.getusersresult.md#getusersresultusers_property) | [UserRecord](./firebase-admin_.userrecord.md#userrecord_class)<!-- -->\[\] | Set of user records, corresponding to the set of users that were requested. Only users that were found are listed here. The result set is unordered. |

## GetUsersResult.notFound property

Set of identifiers that were requested, but not found.

<b>Signature:</b>

```typescript
notFound: UserIdentifier[];
```

## GetUsersResult.users property

Set of user records, corresponding to the set of users that were requested. Only users that were found are listed here. The result set is unordered.

<b>Signature:</b>

```typescript
users: UserRecord[];
```
{% endblock body %}
