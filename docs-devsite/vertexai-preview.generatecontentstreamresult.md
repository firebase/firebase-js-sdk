Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# GenerateContentStreamResult interface
Result object returned from [GenerativeModel.generateContentStream()](./vertexai-preview.generativemodel.md#generativemodelgeneratecontentstream) call. Iterate over `stream` to get chunks as they come in and/or use the `response` promise to get the aggregated response when the stream is done.

<b>Signature:</b>

```typescript
export interface GenerateContentStreamResult 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [response](./vertexai-preview.generatecontentstreamresult.md#generatecontentstreamresultresponse) | Promise&lt;[EnhancedGenerateContentResponse](./vertexai-preview.enhancedgeneratecontentresponse.md#enhancedgeneratecontentresponse_interface)<!-- -->&gt; |  |
|  [stream](./vertexai-preview.generatecontentstreamresult.md#generatecontentstreamresultstream) | AsyncGenerator&lt;[EnhancedGenerateContentResponse](./vertexai-preview.enhancedgeneratecontentresponse.md#enhancedgeneratecontentresponse_interface)<!-- -->&gt; |  |

## GenerateContentStreamResult.response

<b>Signature:</b>

```typescript
response: Promise<EnhancedGenerateContentResponse>;
```

## GenerateContentStreamResult.stream

<b>Signature:</b>

```typescript
stream: AsyncGenerator<EnhancedGenerateContentResponse>;
```