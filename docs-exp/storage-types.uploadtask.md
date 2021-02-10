{% extends "_internal/templates/reference.html" %}
{% block title %}Title{% endblock title %}
{% block body %}

## UploadTask interface

Represents the process of uploading an object. Allows you to monitor and manage the upload.

<b>Signature:</b>

```typescript
export interface UploadTask 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [snapshot](./storage-types.uploadtask.md#uploadtasksnapshot_property) | [UploadTaskSnapshot](./storage-types.uploadtasksnapshot.md#uploadtasksnapshot_interface) | A snapshot of the current task state. |

## Methods

|  Method | Description |
|  --- | --- |
|  [cancel()](./storage-types.uploadtask.md#uploadtaskcancel_method) | Cancels a running task. Has no effect on a complete or failed task. |
|  [catch(onRejected)](./storage-types.uploadtask.md#uploadtaskcatch_method) | Equivalent to calling <code>then(null, onRejected)</code>. |
|  [on(event, nextOrObserver, error, complete)](./storage-types.uploadtask.md#uploadtaskon_method) | Listens for events on this task.<!-- -->Events have three callback functions (referred to as <code>next</code>, <code>error</code>, and <code>complete</code>).<!-- -->If only the event is passed, a function that can be used to register the callbacks is returned. Otherwise, the callbacks are passed after the event.<!-- -->Callbacks can be passed either as three separate arguments <em>or</em> as the <code>next</code>, <code>error</code>, and <code>complete</code> properties of an object. Any of the three callbacks is optional, as long as at least one is specified. In addition, when you add your callbacks, you get a function back. You can call this function to unregister the associated callbacks. |
|  [pause()](./storage-types.uploadtask.md#uploadtaskpause_method) | Pauses a currently running task. Has no effect on a paused or failed task. |
|  [resume()](./storage-types.uploadtask.md#uploadtaskresume_method) | Resumes a paused task. Has no effect on a currently running or failed task. |
|  [then(onFulfilled, onRejected)](./storage-types.uploadtask.md#uploadtaskthen_method) | This object behaves like a Promise, and resolves with its snapshot data when the upload completes. |

## UploadTask.snapshot property

A snapshot of the current task state.

<b>Signature:</b>

```typescript
snapshot: UploadTaskSnapshot;
```

## UploadTask.cancel() method

Cancels a running task. Has no effect on a complete or failed task.

<b>Signature:</b>

```typescript
cancel(): boolean;
```
<b>Returns:</b>

boolean

True if the cancel had an effect.

## UploadTask.catch() method

Equivalent to calling `then(null, onRejected)`<!-- -->.

<b>Signature:</b>

```typescript
catch(onRejected: (error: FirebaseStorageError) => any): Promise<any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  onRejected | (error: [FirebaseStorageError](./storage-types.firebasestorageerror.md#firebasestorageerror_interface)<!-- -->) =&gt; any |  |

<b>Returns:</b>

Promise&lt;any&gt;

## UploadTask.on() method

Listens for events on this task.

Events have three callback functions (referred to as `next`<!-- -->, `error`<!-- -->, and `complete`<!-- -->).

If only the event is passed, a function that can be used to register the callbacks is returned. Otherwise, the callbacks are passed after the event.

Callbacks can be passed either as three separate arguments <em>or</em> as the `next`<!-- -->, `error`<!-- -->, and `complete` properties of an object. Any of the three callbacks is optional, as long as at least one is specified. In addition, when you add your callbacks, you get a function back. You can call this function to unregister the associated callbacks.

<b>Signature:</b>

```typescript
on(
    event: TaskEvent,
    nextOrObserver?:
      | StorageObserver<UploadTaskSnapshot>
      | null
      | ((snapshot: UploadTaskSnapshot) => any),
    error?: ((a: FirebaseStorageError) => any) | null,
    complete?: Unsubscribe | null
  ): Function;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  event | [TaskEvent](./storage-types.md#taskevent_type) | The type of event to listen for. |
|  nextOrObserver | \| [StorageObserver](./storage-types.storageobserver.md#storageobserver_interface)<!-- -->&lt;[UploadTaskSnapshot](./storage-types.uploadtasksnapshot.md#uploadtasksnapshot_interface)<!-- -->&gt; \| null \| ((snapshot: [UploadTaskSnapshot](./storage-types.uploadtasksnapshot.md#uploadtasksnapshot_interface)<!-- -->) =&gt; any) | The <code>next</code> function, which gets called for each item in the event stream, or an observer object with some or all of these three properties (<code>next</code>, <code>error</code>, <code>complete</code>). |
|  error | ((a: [FirebaseStorageError](./storage-types.firebasestorageerror.md#firebasestorageerror_interface)<!-- -->) =&gt; any) \| null | A function that gets called with a <code>FirebaseStorageError</code> if the event stream ends due to an error. |
|  complete | Unsubscribe \| null |  |

<b>Returns:</b>

Function

If only the event argument is passed, returns a function you can use to add callbacks (see the examples above). If more than just the event argument is passed, returns a function you can call to unregister the callbacks.

## Example 1

\*\*Pass callbacks separately or in an object.\*\*

```javascript
var next = function(snapshot) {};
var error = function(error) {};
var complete = function() {};

// The first example.
uploadTask.on(
    firebase.storage.TaskEvent.STATE_CHANGED,
    next,
    error,
    complete);

// This is equivalent to the first example.
uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, {
  'next': next,
  'error': error,
  'complete': complete
});

// This is equivalent to the first example.
var subscribe = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
subscribe(next, error, complete);

// This is equivalent to the first example.
var subscribe = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
subscribe({
  'next': next,
  'error': error,
  'complete': complete
});

```

## Example 2

\*\*Any callback is optional.\*\*

```javascript
// Just listening for completion, this is legal.
uploadTask.on(
    firebase.storage.TaskEvent.STATE_CHANGED,
    null,
    null,
    function() {
      console.log('upload complete!');
    });

// Just listening for progress/state changes, this is legal.
uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function(snapshot) {
  var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
  console.log(percent + "% done");
});

// This is also legal.
uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, {
  'complete': function() {
    console.log('upload complete!');
  }
});

```

## Example 3

\*\*Use the returned function to remove callbacks.\*\*

```javascript
var unsubscribe = uploadTask.on(
    firebase.storage.TaskEvent.STATE_CHANGED,
    function(snapshot) {
      var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
      console.log(percent + "% done");
      // Stop after receiving one update.
      unsubscribe();
    });

// This code is equivalent to the above.
var handle = uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED);
unsubscribe = handle(function(snapshot) {
  var percent = snapshot.bytesTransferred / snapshot.totalBytes * 100;
  console.log(percent + "% done");
  // Stop after receiving one update.
  unsubscribe();
});

```

## UploadTask.pause() method

Pauses a currently running task. Has no effect on a paused or failed task.

<b>Signature:</b>

```typescript
pause(): boolean;
```
<b>Returns:</b>

boolean

True if the operation took effect, false if ignored.

## UploadTask.resume() method

Resumes a paused task. Has no effect on a currently running or failed task.

<b>Signature:</b>

```typescript
resume(): boolean;
```
<b>Returns:</b>

boolean

True if the operation took effect, false if ignored.

## UploadTask.then() method

This object behaves like a Promise, and resolves with its snapshot data when the upload completes.

<b>Signature:</b>

```typescript
then(
    onFulfilled?: ((snapshot: UploadTaskSnapshot) => any) | null,
    onRejected?: ((error: FirebaseStorageError) => any) | null
  ): Promise<any>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  onFulfilled | ((snapshot: [UploadTaskSnapshot](./storage-types.uploadtasksnapshot.md#uploadtasksnapshot_interface)<!-- -->) =&gt; any) \| null | The fulfillment callback. Promise chaining works as normal. |
|  onRejected | ((error: [FirebaseStorageError](./storage-types.firebasestorageerror.md#firebasestorageerror_interface)<!-- -->) =&gt; any) \| null | The rejection callback. |

<b>Returns:</b>

Promise&lt;any&gt;

{% endblock body %}
