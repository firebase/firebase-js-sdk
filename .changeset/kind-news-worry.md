---
'@firebase/app-check': minor
'@firebase/app': minor
---

Add ability to call `initializeAppCheck` without a `provider`. If no `provider` is passed to `initializeAppCheck`, App Check will attempt to initialize with a `ReCaptchaEnterpriseProvider` using the site key found in the `recaptchaSiteKey` field of the Firebase project config.
