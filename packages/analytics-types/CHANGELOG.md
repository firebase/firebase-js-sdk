# @firebase/analytics-types

## 0.8.3

### Patch Changes

- [`b80711925`](https://github.com/firebase/firebase-js-sdk/commit/b807119252dacf46b0122344c2b6dfc503cecde1) [#8604](https://github.com/firebase/firebase-js-sdk/pull/8604) - Upgrade to TypeScript 5.5.4

## 0.8.2

### Patch Changes

- [`ab883d016`](https://github.com/firebase/firebase-js-sdk/commit/ab883d016015de0436346f586d8442b5703771b7) [#8237](https://github.com/firebase/firebase-js-sdk/pull/8237) - Bump all packages so staging works.

## 0.8.1

### Patch Changes

- [`0c5150106`](https://github.com/firebase/firebase-js-sdk/commit/0c515010607bf2223b468acb94c672b1279ed1a0) [#8079](https://github.com/firebase/firebase-js-sdk/pull/8079) - Update `repository.url` field in all `package.json` files to NPM's preferred format.

## 0.8.0

### Minor Changes

- [`1625f7a95`](https://github.com/firebase/firebase-js-sdk/commit/1625f7a95cc3ffb666845db0a8044329be74b5be) [#6799](https://github.com/firebase/firebase-js-sdk/pull/6799) - Update TypeScript version to 4.7.4.

## 0.7.1

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

## 0.7.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

## 0.6.0

### Minor Changes

- [`bd50d8310`](https://github.com/firebase/firebase-js-sdk/commit/bd50d83107be3d87064f72800c608abc94ae3456) [#5206](https://github.com/firebase/firebase-js-sdk/pull/5206) - Fix formatting of links in comments and update some event typings to correctly match GA4 specs.

## 0.5.0

### Minor Changes

- [`02586c975`](https://github.com/firebase/firebase-js-sdk/commit/02586c9754318b01a0051561d2c7c4906059b5af) [#5070](https://github.com/firebase/firebase-js-sdk/pull/5070) - Add `firebase_screen` and `firebase_screen_class` to `logEvent()` overload for `screen_view` events.

## 0.4.0

### Minor Changes

- [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290) [#2800](https://github.com/firebase/firebase-js-sdk/pull/2800) - Analytics now dynamically fetches the app's Measurement ID from the Dynamic Config backend
  instead of depending on the local Firebase config. It will fall back to any `measurementId`
  value found in the local config if the Dynamic Config fetch fails.
