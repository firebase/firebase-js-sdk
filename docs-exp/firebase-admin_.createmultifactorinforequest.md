{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## CreateMultiFactorInfoRequest interface

Interface representing base properties of a user enrolled second factor for a `CreateRequest`<!-- -->.

<b>Signature:</b>

```typescript
export interface CreateMultiFactorInfoRequest 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [displayName](./firebase-admin_.createmultifactorinforequest.md#createmultifactorinforequestdisplayname_property) | string | The optional display name for an enrolled second factor. |
|  [factorId](./firebase-admin_.createmultifactorinforequest.md#createmultifactorinforequestfactorid_property) | string | The type identifier of the second factor. For SMS second factors, this is <code>phone</code>. |

## CreateMultiFactorInfoRequest.displayName property

The optional display name for an enrolled second factor.

<b>Signature:</b>

```typescript
displayName?: string;
```

## CreateMultiFactorInfoRequest.factorId property

The type identifier of the second factor. For SMS second factors, this is `phone`<!-- -->.

<b>Signature:</b>

```typescript
factorId: string;
```
{% endblock body %}
