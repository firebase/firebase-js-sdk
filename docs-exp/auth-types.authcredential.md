{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## AuthCredential class

Interface that represents the credentials returned by an [AuthProvider](./auth-types.authprovider.md#authprovider_interface)<!-- -->.

<b>Signature:</b>

```typescript
export abstract class AuthCredential 
```

## Remarks

Implementations specify the details about each auth provider's credential requirements.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [providerId](./auth-types.authcredential.md#authcredentialproviderid_property) |  | string | The authentication provider ID for the credential. |
|  [signInMethod](./auth-types.authcredential.md#authcredentialsigninmethod_property) |  | string | The authentication sign in method for the credential. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [fromJSON(json)](./auth-types.authcredential.md#authcredentialfromjson_method) | <code>static</code> | Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->. |
|  [toJSON()](./auth-types.authcredential.md#authcredentialtojson_method) |  | Returns a JSON-serializable representation of this object. |

## AuthCredential.providerId property

The authentication provider ID for the credential.

<b>Signature:</b>

```typescript
readonly providerId: string;
```

## Remarks

For example, 'facebook.com', or 'google.com'.

## AuthCredential.signInMethod property

The authentication sign in method for the credential.

<b>Signature:</b>

```typescript
readonly signInMethod: string;
```

## Remarks

For example, [SignInMethod.EMAIL\_PASSWORD](./auth-types.md#signinmethodemail_password_enummember)<!-- -->, or [SignInMethod.EMAIL\_LINK](./auth-types.md#signinmethodemail_link_enummember)<!-- -->. This corresponds to the sign-in method identifier as returned in [fetchSignInMethodsForEmail()](./auth.md#fetchsigninmethodsforemail_function)<!-- -->.

## AuthCredential.fromJSON() method

Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
static fromJSON(json: object | string): AuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  json | object \| string | Either <code>object</code> or the stringified representation of the object. When string is provided, <code>JSON.parse</code> would be called first. |

<b>Returns:</b>

[AuthCredential](./auth-types.authcredential.md#authcredential_class) \| null

If the JSON input does not represent an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->, null is returned.

## AuthCredential.toJSON() method

Returns a JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

a JSON-serializable representation of this object.

{% endblock body %}
