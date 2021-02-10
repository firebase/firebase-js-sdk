{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## CreatePhoneMultiFactorInfoRequest interface

Interface representing a phone specific user enrolled second factor for a `CreateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface CreatePhoneMultiFactorInfoRequest extends CreateMultiFactorInfoRequest 
```
<b>Extends:</b> [CreateMultiFactorInfoRequest](./firebase-admin_.createmultifactorinforequest.md#createmultifactorinforequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [phoneNumber](./firebase-admin_auth.createphonemultifactorinforequest.md#createphonemultifactorinforequestphonenumber_property) | string | The phone number associated with a phone second factor. |

## CreatePhoneMultiFactorInfoRequest.phoneNumber property

The phone number associated with a phone second factor.

<b>Signature:</b>

```typescript
phoneNumber: string;
```
{% endblock body %}
