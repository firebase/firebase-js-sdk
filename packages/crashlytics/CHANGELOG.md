# @firebase/crashlytics

## 0.2.0

### Minor Changes

- [`79b89f2`](https://github.com/firebase/firebase-js-sdk/commit/79b89f2939e584da90d3670dc576852fd1a6f4a7) [#10620](https://github.com/firebase/firebase-js-sdk/pull/10620) - Upgraded OpenTelemetry dependencies to 3.x (`@opentelemetry/api` 1.10.0, SDKs 3.1.1, exporters and instrumentations 0.301.2, `@opentelemetry/browser-instrumentation` 0.11.0, `@opentelemetry/instrumentation-document-load` 0.70.0, and `@opentelemetry/semantic-conventions` 1.45.0), removing deprecated `@opentelemetry/api-logs`, `@opentelemetry/sdk-trace-base`, and `@opentelemetry/sdk-trace-web` dependencies, and updated public attribute types (`CrashlyticsOptions.customAttributes`, `log()`, and `recordError()`) to use `Attributes` from `@opentelemetry/api`.

## 0.1.1

### Patch Changes

- [`a61f2f0`](https://github.com/firebase/firebase-js-sdk/commit/a61f2f0de86114b58192d1449ec0183ec3dbeeea) [#10593](https://github.com/firebase/firebase-js-sdk/pull/10593) - Removed debug `console.log` overrides on `OTLPLogExporter.forceFlush()` and `OTLPLogExporter.shutdown()` so that flushing and shutting down the logger provider delegates to `OTLPExporterBase` without logging to the console.

## 0.1.0

### Minor Changes

- [`fe5dd06`](https://github.com/firebase/firebase-js-sdk/commit/fe5dd06c03ad6d5393b01590ec61bdd9be5e2839) [#10548](https://github.com/firebase/firebase-js-sdk/pull/10548) - First release of Crashlytics for public preview
