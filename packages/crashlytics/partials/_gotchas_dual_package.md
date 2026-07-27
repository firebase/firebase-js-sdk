#### Avoid Dual Package Hazards

Do not mix imports from the main `firebase` umbrella package (e.g. `firebase/app`) and individual `@firebase/*` sub-packages. Doing so can duplicate registration tokens and throw runtime errors like `Component app-check has not been registered yet`.

- **Resolution**: Since the Crashlytics subpackage is available via `@firebase/crashlytics` during private preview, standardize your imports to exclusively use the scoped sub-packages throughout the project:

```typescript
// ❌ Avoid mixing import styles
import { initializeApp } from "firebase/app";
import { recordError } from "@firebase/crashlytics";

// ✅ Import consistently
import { initializeApp } from '@firebase/app';
import { recordError } from '@firebase/crashlytics';
```
