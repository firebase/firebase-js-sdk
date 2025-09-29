---
'firebase': minor
'@firebase/ai': minor
---

Added a `sendFunctionResponses` method to `LiveSession`, allowing function responses to be sent during realtime sessions.
Fixed an issue where function responses during audio conversations caused the WebSocket connection to close. See [GitHub Issue #9264](https://github.com/firebase/firebase-js-sdk/issues/9264).
 - **Breaking Change**: Changed `StartAudioConversationOptions` and `functionCallingHandler` must now return a `Promise<FunctionResponse>`.
   This breaking change is allowed in a minor release since the Live API is in Public Preview.
 - **Breaking Change**: Changed the `functionCallingHandler` property in `StartAudioConversationOptions` so that it now returns a `Promise<FunctionResponse>`.
   This breaking change is allowed in a minor release since the Live API is in Public Preview.
