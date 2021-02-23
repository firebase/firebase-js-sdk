# @firebase/app

## 0.6.15

### Patch Changes

- Updated dependencies [[`6afe42613`](https://github.com/firebase/firebase-js-sdk/commit/6afe42613ed3d7a842d378dc1a09a795811db2ac)]:
  - @firebase/component@0.2.0

## 0.6.14

### Patch Changes

- [`749c7f3d9`](https://github.com/firebase/firebase-js-sdk/commit/749c7f3d985f978cd2a204cbc28c3fff09458b5b) [#4298](https://github.com/firebase/firebase-js-sdk/pull/4298) (fixes [#4258](https://github.com/firebase/firebase-js-sdk/issues/4258)) - Firestore classes like DocumentReference and Query can now be serialized to JSON (#4258)

## 0.6.13

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - @firebase/component@0.1.21

## 0.6.12

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

## 0.6.11

### Patch Changes

- Updated dependencies [[`da1c7df79`](https://github.com/firebase/firebase-js-sdk/commit/da1c7df7982b08bbef82fcc8d93255f3e2d23cca), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/component@0.1.19
  - @firebase/util@0.3.2

## 0.6.10

### Patch Changes

- Updated dependencies [[`d4ca3da0`](https://github.com/firebase/firebase-js-sdk/commit/d4ca3da0a59fcea1261ba69d7eb663bba38d3089)]:
  - @firebase/util@0.3.1
  - @firebase/component@0.1.18

## 0.6.9

### Patch Changes

- Updated dependencies [[`a87676b8`](https://github.com/firebase/firebase-js-sdk/commit/a87676b84b78ccc2f057a22eb947a5d13402949c)]:
  - @firebase/util@0.3.0
  - @firebase/component@0.1.17

## 0.6.8

### Patch Changes

- [`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e) [#3297](https://github.com/firebase/firebase-js-sdk/pull/3297) Thanks [@renovate](https://github.com/apps/renovate)! - Update dependency typescript to v3.9.5

- Updated dependencies [[`a754645e`](https://github.com/firebase/firebase-js-sdk/commit/a754645ec2be1b8c205f25f510196eee298b0d6e)]:
  - @firebase/component@0.1.16
  - @firebase/logger@0.2.6
