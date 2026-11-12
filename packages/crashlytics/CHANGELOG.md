# @firebase/crashlytics

## 0.1.1

### Patch Changes

- [`a61f2f0`](https://github.com/firebase/firebase-js-sdk/commit/a61f2f0de86114b58192d1449ec0183ec3dbeeea) [#10593](https://github.com/firebase/firebase-js-sdk/pull/10593) - Removed debug `console.log` overrides on `OTLPLogExporter.forceFlush()` and `OTLPLogExporter.shutdown()` so that flushing and shutting down the logger provider delegates to `OTLPExporterBase` without logging to the console.

## 0.1.0

### Minor Changes

- [`fe5dd06`](https://github.com/firebase/firebase-js-sdk/commit/fe5dd06c03ad6d5393b01590ec61bdd9be5e2839) [#10548](https://github.com/firebase/firebase-js-sdk/pull/10548) - First release of Crashlytics for public preview
