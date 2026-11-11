---
'@firebase/app': patch
'@firebase/auth': patch
'@firebase/analytics': patch
---

Load external scripts through a single shared Trusted Types policy named `firebase-js-sdk-policy`, so that Auth (gapi and reCAPTCHA scripts) and Analytics (gtag) work on pages that enforce Trusted Types with `require-trusted-types-for 'script'`. If the page's CSP restricts policy names with the `trusted-types` directive, it must allow `firebase-js-sdk-policy`; if it doesn't, an error explaining this is logged when a script fails to load.
