{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## PhoneMultiFactorSignInInfoOptions interface

Options used for signing-in with a second factor.

<b>Signature:</b>

```typescript
export interface PhoneMultiFactorSignInInfoOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [multiFactorHint](./auth-types.phonemultifactorsignininfooptions.md#phonemultifactorsignininfooptionsmultifactorhint_property) | [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) | The [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) obtained via [MultiFactorResolver.hints](./auth-types.multifactorresolver.md#multifactorresolverhints_property)<!-- -->.<!-- -->One of <code>multiFactorHint</code> or <code>multiFactorUid</code> is required. |
|  [multiFactorUid](./auth-types.phonemultifactorsignininfooptions.md#phonemultifactorsignininfooptionsmultifactoruid_property) | string | The uid of the second factor.<!-- -->One of <code>multiFactorHint</code> or <code>multiFactorUid</code> is required. |
|  [session](./auth-types.phonemultifactorsignininfooptions.md#phonemultifactorsignininfooptionssession_property) | [MultiFactorSession](./auth-types.multifactorsession.md#multifactorsession_interface) | The [MultiFactorSession](./auth-types.multifactorsession.md#multifactorsession_interface) obtained via [MultiFactorResolver.session](./auth-types.multifactorresolver.md#multifactorresolversession_property)<!-- -->. |

## PhoneMultiFactorSignInInfoOptions.multiFactorHint property

The [MultiFactorInfo](./auth-types.multifactorinfo.md#multifactorinfo_interface) obtained via [MultiFactorResolver.hints](./auth-types.multifactorresolver.md#multifactorresolverhints_property)<!-- -->.

One of `multiFactorHint` or `multiFactorUid` is required.

<b>Signature:</b>

```typescript
multiFactorHint?: MultiFactorInfo;
```

## PhoneMultiFactorSignInInfoOptions.multiFactorUid property

The uid of the second factor.

One of `multiFactorHint` or `multiFactorUid` is required.

<b>Signature:</b>

```typescript
multiFactorUid?: string;
```

## PhoneMultiFactorSignInInfoOptions.session property

The [MultiFactorSession](./auth-types.multifactorsession.md#multifactorsession_interface) obtained via [MultiFactorResolver.session](./auth-types.multifactorresolver.md#multifactorresolversession_property)<!-- -->.

<b>Signature:</b>

```typescript
session: MultiFactorSession;
```
{% endblock body %}
