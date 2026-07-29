#### Custom Attributes in the Absence of log() Method

Unlike native iOS and Android SDK architectures, the JavaScript Web SDK does **not** expose a standalone `log()` API (e.g. `crashlytics.log()`).

- **Resolution**: Log user activities, session states, and diagnostic details directly as key-value custom attributes using the optional metadata parameter in `recordError()`:

```typescript
// Custom metadata takes the place of typical logging streams
recordError(crashlytics, error, {
  breadcrumb: "User opened shopping cart",
  lastAction: "Click Checkout Button"
});
```
