{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UserImportResult interface

Interface representing the response from the  method for batch importing users to Firebase Auth.

<b>Signature:</b>

```typescript
export interface UserImportResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [errors](./firebase-admin_.userimportresult.md#userimportresulterrors_property) | [FirebaseArrayIndexError](./firebase-admin_.firebasearrayindexerror.md#firebasearrayindexerror_interface)<!-- -->\[\] | An array of errors corresponding to the provided users to import. The length of this array is equal to \[<code>failureCount</code>\](\#failureCount). |
|  [failureCount](./firebase-admin_.userimportresult.md#userimportresultfailurecount_property) | number | The number of user records that failed to import to Firebase Auth. |
|  [successCount](./firebase-admin_.userimportresult.md#userimportresultsuccesscount_property) | number | The number of user records that successfully imported to Firebase Auth. |

## UserImportResult.errors property

An array of errors corresponding to the provided users to import. The length of this array is equal to \[`failureCount`<!-- -->\](\#failureCount).

<b>Signature:</b>

```typescript
errors: FirebaseArrayIndexError[];
```

## UserImportResult.failureCount property

The number of user records that failed to import to Firebase Auth.

<b>Signature:</b>

```typescript
failureCount: number;
```

## UserImportResult.successCount property

The number of user records that successfully imported to Firebase Auth.

<b>Signature:</b>

```typescript
successCount: number;
```
{% endblock body %}
