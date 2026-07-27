### Programmatic Error Capturing

While uncaught exceptions will be logged automatically by framework integrations, you can also record handled exceptions manually using `recordError()`.

```typescript
import { recordError, getCrashlytics } from '@firebase/crashlytics';
import { app } from './lib/firebase';

const crashlytics = getCrashlytics(app);

async function submitPaymentForm() {
  try {
    await api.processTransaction();
  } catch (error) {
    // Manually record handled errors with custom diagnostic context
    recordError(crashlytics, error, {
      userTier: 'Premium Gold',
      checkoutStage: 'BillingAddressVerification',
      transactionCode: 'tx_8412_err',
      retryAttempts: 2
    });

    showFallbackBanner(error);
  }
}
```
