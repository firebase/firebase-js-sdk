Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# StartChatParams interface
Params for [GenerativeModel.startChat()](./vertexai-preview.generativemodel.md#generativemodelstartchat)<!-- -->.

<b>Signature:</b>

```typescript
export interface StartChatParams extends BaseParams 
```
<b>Extends:</b> [BaseParams](./vertexai-preview.baseparams.md#baseparams_interface)

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [history](./vertexai-preview.startchatparams.md#startchatparamshistory) | [Content](./vertexai-preview.content.md#content_interface)<!-- -->\[\] |  |
|  [systemInstruction](./vertexai-preview.startchatparams.md#startchatparamssysteminstruction) | string \| [Part](./vertexai-preview.md#part) \| [Content](./vertexai-preview.content.md#content_interface) |  |
|  [toolConfig](./vertexai-preview.startchatparams.md#startchatparamstoolconfig) | [ToolConfig](./vertexai-preview.toolconfig.md#toolconfig_interface) |  |
|  [tools](./vertexai-preview.startchatparams.md#startchatparamstools) | [Tool](./vertexai-preview.md#tool)<!-- -->\[\] |  |

## StartChatParams.history

<b>Signature:</b>

```typescript
history?: Content[];
```

## StartChatParams.systemInstruction

<b>Signature:</b>

```typescript
systemInstruction?: string | Part | Content;
```

## StartChatParams.toolConfig

<b>Signature:</b>

```typescript
toolConfig?: ToolConfig;
```

## StartChatParams.tools

<b>Signature:</b>

```typescript
tools?: Tool[];
```