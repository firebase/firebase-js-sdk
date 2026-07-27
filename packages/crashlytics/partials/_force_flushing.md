### Force Flushing Telemetry Records (`flush()`)

By default, the telemetry engine batches logs into memory segments to preserve battery life and bandwidth. However, for short-lived operations (like Edge routines, cloud worker pathways, or right before a browser reloads or unloads), logs must be uploaded immediately.

Call the asynchronous `flush` command to send all queued errors to the backend:

```typescript
import { recordError, flush, getCrashlytics } from '@firebase/crashlytics';
import { app } from './lib/firebase';

const crashlytics = getCrashlytics(app);

async function handleApplicationCrash(error: Error) {
  // Capture the error
  recordError(crashlytics, error, { priority: 'IMMEDIATE' });

  // Force an immediate upload before the process terminates or reloads
  await flush(crashlytics);

  // Safe to terminate the current execution context
  window.location.reload();
}
```
