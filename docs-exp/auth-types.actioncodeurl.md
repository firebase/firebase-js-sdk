{% extends "_internal/templates/reference.html" %}{% block title %}Title{% endblock title %}{% block body %}
## ActionCodeURL class

A utility class to parse email action URLs such as password reset, email verification, email link sign in, etc.

<b>Signature:</b>

```typescript
export abstract class ActionCodeURL 
```

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [apiKey](./auth-types.actioncodeurl.md#actioncodeurlapikey_property) |  | string | The API key of the email action link. |
|  [code](./auth-types.actioncodeurl.md#actioncodeurlcode_property) |  | string | The action code of the email action link. |
|  [continueUrl](./auth-types.actioncodeurl.md#actioncodeurlcontinueurl_property) |  | string \| null | The continue URL of the email action link. Null if not provided. |
|  [languageCode](./auth-types.actioncodeurl.md#actioncodeurllanguagecode_property) |  | string \| null | The language code of the email action link. Null if not provided. |
|  [operation](./auth-types.actioncodeurl.md#actioncodeurloperation_property) |  | [ActionCodeOperation](./auth-types.md#actioncodeoperation_enum) | The action performed by the email action link. It returns from one of the types from [ActionCodeInfo](./auth-types.actioncodeinfo.md#actioncodeinfo_interface) |
|  [tenantId](./auth-types.actioncodeurl.md#actioncodeurltenantid_property) |  | string \| null | The tenant ID of the email action link. Null if the email action is from the parent project. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [parseLink(link)](./auth-types.actioncodeurl.md#actioncodeurlparselink_method) | <code>static</code> | Parses the email action link string and returns an [ActionCodeURL](./auth-types.actioncodeurl.md#actioncodeurl_class) if the link is valid, otherwise returns null. |

## ActionCodeURL.apiKey property

The API key of the email action link.

<b>Signature:</b>

```typescript
readonly apiKey: string;
```

## ActionCodeURL.code property

The action code of the email action link.

<b>Signature:</b>

```typescript
readonly code: string;
```

## ActionCodeURL.continueUrl property

The continue URL of the email action link. Null if not provided.

<b>Signature:</b>

```typescript
readonly continueUrl: string | null;
```

## ActionCodeURL.languageCode property

The language code of the email action link. Null if not provided.

<b>Signature:</b>

```typescript
readonly languageCode: string | null;
```

## ActionCodeURL.operation property

The action performed by the email action link. It returns from one of the types from [ActionCodeInfo](./auth-types.actioncodeinfo.md#actioncodeinfo_interface)

<b>Signature:</b>

```typescript
readonly operation: ActionCodeOperation;
```

## ActionCodeURL.tenantId property

The tenant ID of the email action link. Null if the email action is from the parent project.

<b>Signature:</b>

```typescript
readonly tenantId: string | null;
```

## ActionCodeURL.parseLink() method

Parses the email action link string and returns an [ActionCodeURL](./auth-types.actioncodeurl.md#actioncodeurl_class) if the link is valid, otherwise returns null.

<b>Signature:</b>

```typescript
static parseLink(link: string): ActionCodeURL | null;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  link | string | The email action link string. |

<b>Returns:</b>

[ActionCodeURL](./auth-types.actioncodeurl.md#actioncodeurl_class) \| null

The ActionCodeURL object, or null if the link is invalid.

{% endblock body %}
