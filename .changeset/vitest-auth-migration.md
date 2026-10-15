---
'@firebase/auth': patch
---

- Fix an unhandled exception when a popup or redirect operation (e.g., `signInWithPopup`) is cancelled by a second call before the first operation finishes initializing.
- Fix an unhandled promise rejection during initial IndexedDB cache population if the page navigates away or is backgrounded while loading.
- Fix an uncatchable unhandled promise rejection when background reCAPTCHA Enterprise token verification fails during `initializeRecaptchaConfig` or `signInWithPhoneNumber`.

