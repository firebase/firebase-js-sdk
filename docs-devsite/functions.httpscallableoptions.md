Project: /docs/reference/js/_project.yaml
Book: /docs/reference/_book.yaml
page_type: reference

{% comment %}
DO NOT EDIT THIS FILE!
This is generated by the JS SDK team, and any local changes will be
overwritten. Changes should be made in the source code at
https://github.com/firebase/firebase-js-sdk
{% endcomment %}

# HttpsCallableOptions interface
An interface for metadata about how calls should be executed.

<b>Signature:</b>

```typescript
export interface HttpsCallableOptions 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [limitedUseAppCheckTokens](./functions.httpscallableoptions.md#httpscallableoptionslimiteduseappchecktokens) | boolean | If set to true, uses a limited-use App Check token for callable function requests from this instance of [Functions](./functions.functions.md#functions_interface)<!-- -->. You must use limited-use tokens to call functions with replay protection enabled. By default, this is false. |
|  [timeout](./functions.httpscallableoptions.md#httpscallableoptionstimeout) | number | Time in milliseconds after which to cancel if there is no response. Default is 70000. |

## HttpsCallableOptions.limitedUseAppCheckTokens

If set to true, uses a limited-use App Check token for callable function requests from this instance of [Functions](./functions.functions.md#functions_interface)<!-- -->. You must use limited-use tokens to call functions with replay protection enabled. By default, this is false.

<b>Signature:</b>

```typescript
limitedUseAppCheckTokens?: boolean;
```

## HttpsCallableOptions.timeout

Time in milliseconds after which to cancel if there is no response. Default is 70000.

<b>Signature:</b>

```typescript
timeout?: number;
```
