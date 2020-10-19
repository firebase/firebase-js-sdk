# @firebase/webchannel-wrapper

## 0.4.0

### Minor Changes

- [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc) [#3724](https://github.com/firebase/firebase-js-sdk/pull/3724) - Adds a new `experimentalAutoDetectLongPolling` to FirestoreSettings. When
  enabled, the SDK's underlying transport (WebChannel) automatically detects if
  long-polling should be used. This is very similar to
  `experimentalForceLongPolling`, but only uses long-polling if required.

## 0.3.0

### Minor Changes

- [`7f0860a4`](https://github.com/firebase/firebase-js-sdk/commit/7f0860a4ced76da8492ae44d2267a2f1cc58eccb) [#3372](https://github.com/firebase/firebase-js-sdk/pull/3372) - Upgrade to the latest version of Google Closure Library and Compiler. This dependency will be
  necessary for future updates to the @firebase/firestore package. Developers will not need to
  make any changes to their code to handle this change.
