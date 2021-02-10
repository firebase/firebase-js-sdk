{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## ActionCodeInfo interface

A response from [checkActionCode()](./auth.md#checkactioncode_function)<!-- -->.

<b>Signature:</b>

```typescript
export interface ActionCodeInfo 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [data](./auth-types.actioncodeinfo.md#actioncodeinfodata_property) | { email?: string \| null; multiFactorInfo?: [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) \| null; previousEmail?: string \| null; } | The data associated with the action code. |
|  [operation](./auth-types.actioncodeinfo.md#actioncodeinfooperation_property) | [ActionCodeOperation](./auth-types.md#actioncodeoperation_enum) | The type of operation that generated the action code. |

## ActionCodeInfo.data property

The data associated with the action code.

<b>Signature:</b>

```typescript
data: {
    email?: string | null;
    multiFactorInfo?: MultiFactorInfo | null;
    previousEmail?: string | null;
  };
```

## Remarks

For the , , and  actions, this object contains an email field with the address the email was sent to.

For the  action, which allows a user to undo an email address change, this object also contains a `previousEmail` field with the user account's current email address. After the action completes, the user's email address will revert to the value in the `email` field from the value in `previousEmail` field.

For the  action, which allows a user to verify the email before updating it, this object contains a `previousEmail` field with the user account's email address before updating. After the action completes, the user's email address will be updated to the value in the `email` field from the value in `previousEmail` field.

For the  action, which allows a user to unenroll a newly added second factor, this object contains a `multiFactorInfo` field with the information about the second factor. For phone second factor, the `multiFactorInfo` is a [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) object, which contains the phone number.

## ActionCodeInfo.operation property

The type of operation that generated the action code.

<b>Signature:</b>

```typescript
operation: ActionCodeOperation;
```
{% endblock body %}
