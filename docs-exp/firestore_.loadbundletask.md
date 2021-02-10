{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## LoadBundleTask class

Represents the task of loading a Firestore bundle. It provides progress of bundle loading, as well as task completion and error events.

The API is compatible with `Promise<LoadBundleTaskProgress>`<!-- -->.

<b>Signature:</b>

```typescript
export declare class LoadBundleTask 
```

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [catch(onRejected)](./firestore_.loadbundletask.md#loadbundletaskcatch_method) |  | Implements the <code>Promise&lt;LoadBundleTaskProgress&gt;.catch</code> interface. |
|  [onProgress(next, error, complete)](./firestore_.loadbundletask.md#loadbundletaskonprogress_method) |  | Registers functions to listen to bundle loading progress events. |
|  [then(onFulfilled, onRejected)](./firestore_.loadbundletask.md#loadbundletaskthen_method) |  | Implements the <code>Promise&lt;LoadBundleTaskProgress&gt;.then</code> interface. |

## LoadBundleTask.catch() method

Implements the `Promise<LoadBundleTaskProgress>.catch` interface.

<b>Signature:</b>

```typescript
catch<R>(onRejected: (a: FirestoreError) => R | LoadBundleTask<R>): Promise<R | LoadBundleTaskProgress>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  onRejected | (a: [FirestoreError](./firestore_.firestoreerror.md#firestoreerror_class)<!-- -->) =&gt; R \| [LoadBundleTask](./firestore_.loadbundletask.md#loadbundletask_class)<!-- -->&lt;R&gt; | Called when an error occurs during bundle loading. |

<b>Returns:</b>

Promise&lt;R \| [LoadBundleTaskProgress](./firestore_.loadbundletaskprogress.md#loadbundletaskprogress_interface)<!-- -->&gt;

## LoadBundleTask.onProgress() method

Registers functions to listen to bundle loading progress events.

<b>Signature:</b>

```typescript
onProgress(next?: (progress: LoadBundleTaskProgress) => unknown, error?: (err: FirestoreError) => unknown, complete?: () => void): void;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  next | (progress: [LoadBundleTaskProgress](./firestore_.loadbundletaskprogress.md#loadbundletaskprogress_interface)<!-- -->) =&gt; unknown | Called when there is a progress update from bundle loading. Typically <code>next</code> calls occur each time a Firestore document is loaded from the bundle. |
|  error | (err: [FirestoreError](./firestore_.firestoreerror.md#firestoreerror_class)<!-- -->) =&gt; unknown | Called when an error occurs during bundle loading. The task aborts after reporting the error, and there should be no more updates after this. |
|  complete | () =&gt; void | Called when the loading task is complete. |

<b>Returns:</b>

void

## LoadBundleTask.then() method

Implements the `Promise<LoadBundleTaskProgress>.then` interface.

<b>Signature:</b>

```typescript
then<T, R>(onFulfilled?: (a: LoadBundleTaskProgress) => T | LoadBundleTask<T>, onRejected?: (a: FirestoreError) => R | LoadBundleTask<R>): Promise<T | R>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  onFulfilled | (a: [LoadBundleTaskProgress](./firestore_.loadbundletaskprogress.md#loadbundletaskprogress_interface)<!-- -->) =&gt; T \| [LoadBundleTask](./firestore_.loadbundletask.md#loadbundletask_class)<!-- -->&lt;T&gt; | Called on the completion of the loading task with a final <code>LoadBundleTaskProgress</code> update. The update will always have its <code>taskState</code> set to <code>&quot;Success&quot;</code>. |
|  onRejected | (a: [FirestoreError](./firestore_.firestoreerror.md#firestoreerror_class)<!-- -->) =&gt; R \| [LoadBundleTask](./firestore_.loadbundletask.md#loadbundletask_class)<!-- -->&lt;R&gt; | Called when an error occurs during bundle loading. |

<b>Returns:</b>

Promise&lt;T \| R&gt;

{% endblock body %}
