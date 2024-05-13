---
'@firebase/analytics': patch
---

Analytics - fixed an issue where setConsent was clobbering the consentSettings before passing them to the gtag implementation.
