{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## CreateRequest interface

Interface representing the properties to set on a new user record to be created.

<b>Signature:</b>

```typescript
export interface CreateRequest extends UpdateRequest 
```
<b>Extends:</b> [UpdateRequest](./firebase-admin_.updaterequest.md#updaterequest_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [multiFactor](./firebase-admin_.createrequest.md#createrequestmultifactor_property) | [MultiFactorCreateSettings](./firebase-admin_.multifactorcreatesettings.md#multifactorcreatesettings_interface) | The user's multi-factor related properties. |
|  [uid](./firebase-admin_.createrequest.md#createrequestuid_property) | string | The user's <code>uid</code>. |

## CreateRequest.multiFactor property

The user's multi-factor related properties.

<b>Signature:</b>

```typescript
multiFactor?: MultiFactorCreateSettings;
```

## CreateRequest.uid property

The user's `uid`<!-- -->.

<b>Signature:</b>

```typescript
uid?: string;
```
{% endblock body %}
