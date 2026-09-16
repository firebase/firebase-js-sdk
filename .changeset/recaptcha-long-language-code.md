---
'@firebase/auth': patch
---

Fix `RecaptchaVerifier` throwing `auth/argument-error` for long BCP-47 language codes (for example `en-GB-oxendict`, as returned by `useDeviceLanguage()`). The reCAPTCHA host-language validation no longer rejects valid language tags longer than 6 characters.
