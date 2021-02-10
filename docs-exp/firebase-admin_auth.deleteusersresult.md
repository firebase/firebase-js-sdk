{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## DeleteUsersResult interface

Represents the result of the  API.

<b>Signature:</b>

```typescript
export interface DeleteUsersResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [errors](./firebase-admin_auth.deleteusersresult.md#deleteusersresulterrors_property) | [FirebaseArrayIndexError](./firebase-admin_.firebasearrayindexerror.md#firebasearrayindexerror_interface)<!-- -->\[\] | A list of <code>FirebaseArrayIndexError</code> instances describing the errors that were encountered during the deletion. Length of this list is equal to the return value of \[<code>failureCount</code>\](\#failureCount). |
|  [failureCount](./firebase-admin_auth.deleteusersresult.md#deleteusersresultfailurecount_property) | number | The number of user records that failed to be deleted (possibly zero). |
|  [successCount](./firebase-admin_auth.deleteusersresult.md#deleteusersresultsuccesscount_property) | number | The number of users that were deleted successfully (possibly zero). Users that did not exist prior to calling <code>deleteUsers()</code> are considered to be successfully deleted. |

## DeleteUsersResult.errors property

A list of `FirebaseArrayIndexError` instances describing the errors that were encountered during the deletion. Length of this list is equal to the return value of \[`failureCount`<!-- -->\](\#failureCount).

<b>Signature:</b>

```typescript
errors: FirebaseArrayIndexError[];
```

## DeleteUsersResult.failureCount property

The number of user records that failed to be deleted (possibly zero).

<b>Signature:</b>

```typescript
failureCount: number;
```

## DeleteUsersResult.successCount property

The number of users that were deleted successfully (possibly zero). Users that did not exist prior to calling `deleteUsers()` are considered to be successfully deleted.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}
