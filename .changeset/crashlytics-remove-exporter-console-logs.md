---
'@firebase/crashlytics': patch
---

Removed debug `console.log` overrides on `OTLPLogExporter.forceFlush()` and `OTLPLogExporter.shutdown()` so that flushing and shutting down the logger provider delegates to `OTLPExporterBase` without logging to the console.
