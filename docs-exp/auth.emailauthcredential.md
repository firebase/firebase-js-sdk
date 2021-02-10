{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## EmailAuthCredential class

Interface that represents the credentials returned by [EmailAuthProvider](./auth.emailauthprovider.md#emailauthprovider_class) for [ProviderId.PASSWORD](./auth-types.md#provideridpassword_enummember)

<b>Signature:</b>

```typescript
export declare class EmailAuthCredential extends AuthCredential implements externs.AuthCredential 
```
<b>Extends:</b> [AuthCredential](./auth.authcredential.md#authcredential_class)

<b>Implements:</b> externs.[AuthCredential](./auth-types.authcredential.md#authcredential_class)

## Remarks

Covers both [SignInMethod.EMAIL\_PASSWORD](./auth-types.md#signinmethodemail_password_enummember) and [SignInMethod.EMAIL\_LINK](./auth-types.md#signinmethodemail_link_enummember)<!-- -->.

The constructor for this class is marked as internal. Third-party code should not call the constructor directly or create subclasses that extend the `EmailAuthCredential` class.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [email](./auth.emailauthcredential.md#emailauthcredentialemail_property) |  | string |  |
|  [password](./auth.emailauthcredential.md#emailauthcredentialpassword_property) |  | string |  |
|  [tenantId](./auth.emailauthcredential.md#emailauthcredentialtenantid_property) |  | string \| null |  |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [fromJSON(json)](./auth.emailauthcredential.md#emailauthcredentialfromjson_method) | <code>static</code> | Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->. |
|  [toJSON()](./auth.emailauthcredential.md#emailauthcredentialtojson_method) |  | Returns a JSON-serializable representation of this object. |

## EmailAuthCredential.email property

<b>Signature:</b>

```typescript
readonly email: string;
```

## EmailAuthCredential.password property

<b>Signature:</b>

```typescript
readonly password: string;
```

## EmailAuthCredential.tenantId property

<b>Signature:</b>

```typescript
readonly tenantId: string | null;
```

## EmailAuthCredential.fromJSON() method

Static method to deserialize a JSON representation of an object into an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->.

<b>Signature:</b>

```typescript
static fromJSON(json: object | string): EmailAuthCredential | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  json | object \| string | Either <code>object</code> or the stringified representation of the object. When string is provided, <code>JSON.parse</code> would be called first. |

<b>Returns:</b>

[EmailAuthCredential](./auth.emailauthcredential.md#emailauthcredential_class) \| null

If the JSON input does not represent an [AuthCredential](./auth-types.authcredential.md#authcredential_class)<!-- -->, null is returned.

## EmailAuthCredential.toJSON() method

Returns a JSON-serializable representation of this object.

<b>Signature:</b>

```typescript
toJSON(): object;
```
<b>Returns:</b>

object

a JSON-serializable representation of this object.

{% endblock body %}
