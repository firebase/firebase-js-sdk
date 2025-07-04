Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# CountTokensResponse interface
Response from calling [GenerativeModel.countTokens()](./ai.generativemodel.md#generativemodelcounttokens)<!-- -->.

<b>Signature:</b>

```typescript
export interface CountTokensResponse 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [promptTokensDetails](./ai.counttokensresponse.md#counttokensresponseprompttokensdetails) | [ModalityTokenCount](./ai.modalitytokencount.md#modalitytokencount_interface)<!-- -->\[\] | The breakdown, by modality, of how many tokens are consumed by the prompt. |
|  [totalBillableCharacters](./ai.counttokensresponse.md#counttokensresponsetotalbillablecharacters) | number |  |
|  [totalTokens](./ai.counttokensresponse.md#counttokensresponsetotaltokens) | number | The total number of tokens counted across all instances from the request. |

## CountTokensResponse.promptTokensDetails

The breakdown, by modality, of how many tokens are consumed by the prompt.

<b>Signature:</b>

```typescript
promptTokensDetails?: ModalityTokenCount[];
```

## CountTokensResponse.totalBillableCharacters

> Warning: This API is now obsolete.
> 
> Use `totalTokens` instead. This property is undefined when using models greater than `gemini-1.5-*`<!-- -->.
> 
> The total number of billable characters counted across all instances from the request.
> 

<b>Signature:</b>

```typescript
totalBillableCharacters?: number;
```

## CountTokensResponse.totalTokens

The total number of tokens counted across all instances from the request.

<b>Signature:</b>

```typescript
totalTokens: number;
```
