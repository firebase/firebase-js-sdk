{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## MultiFactorConfig interface

<b>Signature:</b>

```typescript
export interface MultiFactorConfig 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [factorIds](./firebase-admin_auth.multifactorconfig.md#multifactorconfigfactorids_property) | [AuthFactorType](./firebase-admin_.md#authfactortype_type)<!-- -->\[\] | The list of identifiers for enabled second factors. Currently only ‘phone’ is supported. |
|  [state](./firebase-admin_auth.multifactorconfig.md#multifactorconfigstate_property) | [MultiFactorConfigState](./firebase-admin_.md#multifactorconfigstate_type) | The multi-factor config state. |

## MultiFactorConfig.factorIds property

The list of identifiers for enabled second factors. Currently only ‘phone’ is supported.

<b>Signature:</b>

```typescript
factorIds?: AuthFactorType[];
```

## MultiFactorConfig.state property

The multi-factor config state.

<b>Signature:</b>

```typescript
state: MultiFactorConfigState;
```
{% endblock body %}
