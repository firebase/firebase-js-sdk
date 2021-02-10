{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UpdatePhoneMultiFactorInfoRequest interface

Interface representing a phone specific user enrolled second factor for an `UpdateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface UpdatePhoneMultiFactorInfoRequest extends UpdateMultiFactorInfoRequest 
```
<b>Extends:</b> [UpdateMultiFactorInfoRequest](./firebase-admin_.updatemultifactorinforequest.md#updatemultifactorinforequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [phoneNumber](./firebase-admin_.updatephonemultifactorinforequest.md#updatephonemultifactorinforequestphonenumber_property) | string | The phone number associated with a phone second factor. |

## UpdatePhoneMultiFactorInfoRequest.phoneNumber property

The phone number associated with a phone second factor.

<b>Signature:</b>

```typescript
phoneNumber: string;
```
{% endblock body %}
