Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# FunctionResponse interface
The result output from a [FunctionCall](./ai.functioncall.md#functioncall_interface) that contains a string representing the [FunctionDeclaration.name](./ai.functiondeclaration.md#functiondeclarationname) and a structured JSON object containing any output from the function is used as context to the model. This should contain the result of a [FunctionCall](./ai.functioncall.md#functioncall_interface) made based on model prediction.

<b>Signature:</b>

```typescript
export interface FunctionResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [name](./ai.functionresponse.md#functionresponsename) | string |  |
|  [response](./ai.functionresponse.md#functionresponseresponse) | object |  |

## FunctionResponse.name

<b>Signature:</b>

```typescript
name: string;
```

## FunctionResponse.response

<b>Signature:</b>

```typescript
response: object;
```
