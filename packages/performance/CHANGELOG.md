# @firebase/performance

## 0.4.6

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0
  - @firebase/installations@0.4.20

## 0.4.5

### Patch Changes

- [`6f2c7b7aa`](https://github.com/firebase/firebase-js-sdk/commit/6f2c7b7aae72d7be88c7a477f1a5d38bd5e8dfe4) [#3896](https://github.com/firebase/firebase-js-sdk/pull/3896) - Dispatch up to 1000 events for each network request when collecting performance events.

## 0.4.4

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21
  - @firebase/installations@0.4.19

## 0.4.3

### Patch Changes

- [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487) [#3932](https://github.com/firebase/firebase-js-sdk/pull/3932) - Point browser field to esm build. Now you need to use default import instead of namespace import to import firebase.

  Before this change

  ```
  import * as firebase from 'firebase/app';
  ```

  After this change

  ```
  import firebase from 'firebase/app';
  ```

- Updated dependencies [[`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce)]:
  - @firebase/component@0.1.20
  - @firebase/util@0.3.3
  - @firebase/installations@0.4.18

## 0.4.2

### Patch Changes

- [`48b0b0f7c`](https://github.com/firebase/firebase-js-sdk/commit/48b0b0f7c9137652f438cf04395debddeb3711d0) [#3850](https://github.com/firebase/firebase-js-sdk/pull/3850) - Moved `loggingEnabled` check to wait until performance initialization finishes, thus avoid dropping custom traces right after getting `performance` object.

* [`8728e1a0f`](https://github.com/firebase/firebase-js-sdk/commit/8728e1a0fc9027a21e3b77e4a058a7e8513a4646) [#3866](https://github.com/firebase/firebase-js-sdk/pull/3866) - Throws exception when startTime or duration is not positive value in `trace.record()` API.

## 0.4.1

### Patch Changes

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2
  - @firebase/installations@0.4.17

## 0.4.0

### Minor Changes

- [`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e) [#3424](https://github.com/firebase/firebase-js-sdk/pull/3424) - Issue 2393 - Add environment check to Performance Module

## 0.3.11

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18
  - @firebase/installations@0.4.16

## 0.3.10

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17
  - @firebase/installations@0.4.15

## 0.3.9

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/installations@0.4.14
  - @firebase/logger@0.2.6

## 0.3.0

- [changed] Updated internal performance event transport mechanism.

## 0.2.30

- [changed] Internal transport protocol update from proto2 to proto3.
