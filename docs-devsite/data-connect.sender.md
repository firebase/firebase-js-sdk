Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# Sender interface
<b>Signature:</b>

```typescript
export declare interface Sender<T> 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [abort](./data-connect.sender.md#senderabort) | () =&gt; void |  |
|  [send](./data-connect.sender.md#sendersend) | () =&gt; Promise&lt;T&gt; |  |

## Sender.abort

<b>Signature:</b>

```typescript
abort: () => void;
```

## Sender.send

<b>Signature:</b>

```typescript
send: () => Promise<T>;
```