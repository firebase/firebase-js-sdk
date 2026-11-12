---
'@firebase/crashlytics': minor
---

Upgraded OpenTelemetry dependencies to 3.x (`@opentelemetry/api` 1.10.0, SDKs 3.1.1, exporters and instrumentations 0.301.2, `@opentelemetry/browser-instrumentation` 0.11.0, `@opentelemetry/instrumentation-document-load` 0.70.0, and `@opentelemetry/semantic-conventions` 1.45.0), removing deprecated `@opentelemetry/api-logs`, `@opentelemetry/sdk-trace-base`, and `@opentelemetry/sdk-trace-web` dependencies, and updated public attribute types (`CrashlyticsOptions.customAttributes`, `log()`, and `recordError()`) to use `Attributes` from `@opentelemetry/api`.
