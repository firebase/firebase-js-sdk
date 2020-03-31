# Unreleased
- [fixed] Fixed an issue introduced in 7.7.0 where the FCM switched to provide base64-encoded VAPID key
to [PushManager](https://developer.mozilla.org/en-US/docs/Web/API/PushManager) for push 
subscribtion. For backward compatibility, the SDK switched back to use VAPID key in type (ArrayBuffer)[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer].