---
'@firebase/ai': minor
---

Added a `sendFunctionResponses` method to `LiveSession`, allowing function responses to be sent during realtime sessions.
Fixes an issue where function responses during audio conversations caused the WebSocket connection to close. See [GitHub Issue #9264](https://github.com/firebase/firebase-js-sdk/issues/9264).
 - **Breaking Change**: `StartAudioConversationOptions`' `functionCallingHandler` must now return a `Promise<FunctionResponse>`.
   This breaking change is allowed since the Live API is in Public Preview.
