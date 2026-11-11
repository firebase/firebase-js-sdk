---
'@firebase/crashlytics': patch
'firebase': patch
---

Updated `@opentelemetry/browser-instrumentation` from 0.6.0 to 0.11.0. Its instrumentations now use the `@opentelemetry/browser-api` contract, so breadcrumbs enables them directly with the Crashlytics logger provider instead of through `registerInstrumentations()`. Middle clicks and right clicks are now recorded as click breadcrumbs, and the navigation timing breadcrumb uses the navigation entry's start time.
