Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# SerializedRef interface
Serialized Ref as a result of `QueryResult.toJSON()`

<b>Signature:</b>

```typescript
export declare interface SerializedRef<Data, Variables> extends OpResult<Data> 
```
<b>Extends:</b> [OpResult](./data-connect.opresult.md#opresult_interface)<!-- -->&lt;Data&gt;

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [refInfo](./data-connect.serializedref.md#serializedrefrefinfo) | [RefInfo](./data-connect.refinfo.md#refinfo_interface)<!-- -->&lt;Variables&gt; |  |

## SerializedRef.refInfo

<b>Signature:</b>

```typescript
refInfo: RefInfo<Variables>;
```