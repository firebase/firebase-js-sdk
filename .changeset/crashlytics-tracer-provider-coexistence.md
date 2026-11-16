---
'@firebase/crashlytics': minor
'firebase': minor
---

Isolated the Crashlytics OpenTelemetry `TracerProvider` from the global `@opentelemetry/api` registry by default and explicitly bound Crashlytics tracing instrumentations to it so Crashlytics coexists cleanly with host OpenTelemetry tracing setups regardless of initialization order. Added an opt-in `CrashlyticsOptions.registerGlobalTracerProvider` option (defaulting to `false`) to mirror `registerGlobalLoggerProvider`.
