# @firebase/rules-unit-testing

## 2.0.7

### Patch Changes

- [`d071bd1ac`](https://github.com/firebase/firebase-js-sdk/commit/d071bd1acaa0583b4dd3454387fc58eafddb5c30) [#7007](https://github.com/firebase/firebase-js-sdk/pull/7007) (fixes [#7005](https://github.com/firebase/firebase-js-sdk/issues/7005)) - Move exports.default fields to always be the last field. This fixes a bug caused in 9.17.0 that prevented some bundlers and frameworks from building.

## 2.0.6

### Patch Changes

- [`0bab0b7a7`](https://github.com/firebase/firebase-js-sdk/commit/0bab0b7a786d1563bf665904c7097d1fe06efce5) [#6981](https://github.com/firebase/firebase-js-sdk/pull/6981) - Added browser CJS entry points (expected by Jest when using JSDOM mode).

## 2.0.5

### Patch Changes

- [`4af28c1a4`](https://github.com/firebase/firebase-js-sdk/commit/4af28c1a42bd25ce2353f694ca1724c6101cbce5) [#6682](https://github.com/firebase/firebase-js-sdk/pull/6682) - Upgrade TypeScript to 4.7.4.

## 2.0.4

### Patch Changes

- [`1703bb31a`](https://github.com/firebase/firebase-js-sdk/commit/1703bb31afa806087167079641af79c9293ab423) [#6442](https://github.com/firebase/firebase-js-sdk/pull/6442) (fixes [#6438](https://github.com/firebase/firebase-js-sdk/issues/6438)) - Update `@grpc/proto-loader` and `firebase-admin` dependencies to address `protobufjs` security issue.

* [`1a15c7da7`](https://github.com/firebase/firebase-js-sdk/commit/1a15c7da7e27cb1571dc1bfa2f144d68fa6b8583) [#6454](https://github.com/firebase/firebase-js-sdk/pull/6454) - Update firebase-functions to a version compatible with firebase-admin.

## 2.0.3

### Patch Changes

- [`b091b0228`](https://github.com/firebase/firebase-js-sdk/commit/b091b02288fa0d1439dfe945a33325a0495f568d) [#6360](https://github.com/firebase/firebase-js-sdk/pull/6360) (fixes [#6080](https://github.com/firebase/firebase-js-sdk/issues/6080)) - Add Node ESM build to rules-unit-testing.

## 2.0.2

### Patch Changes

- [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

## 2.0.1

### Patch Changes

- [`46d26ff96`](https://github.com/firebase/firebase-js-sdk/commit/46d26ff969c08b6fc8486f0c4b8fa8fc5a6c81d9) [#5500](https://github.com/firebase/firebase-js-sdk/pull/5500) - Fix typing issues where Database/Firestore/Storage compat instances returned by RulesTestContext are not compatible with v9 modular APIs.

* [`29e0be2cb`](https://github.com/firebase/firebase-js-sdk/commit/29e0be2cb25338bb667ccb3bf63cd8bd0d1b3dc8) [#5501](https://github.com/firebase/firebase-js-sdk/pull/5501) - Set RTDB namespace to be same as projectId by default instead of `${projectId}-default-rtdb`. This fixes rules not being applied and other issues related to namespace mismatch.

## 2.0.0

### Major Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - BREAKING: Implement Rules Unit Testing v2 with new design and APIs.

* [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`5bc6afb75`](https://github.com/firebase/firebase-js-sdk/commit/5bc6afb75b5267bad5940c32458c315e5394321d), [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - firebase@9.0.0

## 1.3.15

### Patch Changes

- [`749f5a21c`](https://github.com/firebase/firebase-js-sdk/commit/749f5a21cb814064aba1af7fde9fb1a7cfc04575) [#5259](https://github.com/firebase/firebase-js-sdk/pull/5259) - Fix JWT format and interop with Storage Emulator. Fixes #3442.

- Updated dependencies [[`d0710d500`](https://github.com/firebase/firebase-js-sdk/commit/d0710d5006a07318213163127051eebf0c339383), [`bb6b5abff`](https://github.com/firebase/firebase-js-sdk/commit/bb6b5abff6f89ce9ec1bd66ff4e795a059a98eec), [`3c6a11c8d`](https://github.com/firebase/firebase-js-sdk/commit/3c6a11c8d0b35afddb50e9c3e0c4d2e30f642131)]:
  - firebase@8.10.0
  - @firebase/component@0.5.6
  - @firebase/util@1.3.0

## 1.3.14

### Patch Changes

- Updated dependencies [[`f1027e3c2`](https://github.com/firebase/firebase-js-sdk/commit/f1027e3c24cab52046766a898c6702860f5ad3f6)]:
  - firebase@8.9.1

## 1.3.13

### Patch Changes

- Updated dependencies [[`8599d9141`](https://github.com/firebase/firebase-js-sdk/commit/8599d91416ae8ac5202742f11cee00666d3360ec), [`bd50d8310`](https://github.com/firebase/firebase-js-sdk/commit/bd50d83107be3d87064f72800c608abc94ae3456)]:
  - firebase@8.9.0

## 1.3.12

### Patch Changes

- Updated dependencies [[`a3cbe719b`](https://github.com/firebase/firebase-js-sdk/commit/a3cbe719b1bd733a5c4c15ee0d0e6388d512054c)]:
  - @firebase/util@1.2.0
  - @firebase/component@0.5.5
  - firebase@8.8.1

## 1.3.11

### Patch Changes

- Updated dependencies [[`b3caa5158`](https://github.com/firebase/firebase-js-sdk/commit/b3caa515846d2bfcf4a95dedff69f08d503cbfc2), [`02586c975`](https://github.com/firebase/firebase-js-sdk/commit/02586c9754318b01a0051561d2c7c4906059b5af), [`2cd9d7c39`](https://github.com/firebase/firebase-js-sdk/commit/2cd9d7c394dd0c84f285fbcfa4b0a5d79509451f)]:
  - firebase@8.8.0

## 1.3.10

### Patch Changes

- Updated dependencies []:
  - firebase@8.7.1

## 1.3.9

### Patch Changes

- Updated dependencies [[`870dd5e35`](https://github.com/firebase/firebase-js-sdk/commit/870dd5e3594f5b588bdc2801c60c6d984d1d08cc), [`56a6a9d4a`](https://github.com/firebase/firebase-js-sdk/commit/56a6a9d4af2766154584a0f66d3c4d8024d74ba5)]:
  - firebase@8.7.0
  - @firebase/component@0.5.4

## 1.3.8

### Patch Changes

- Updated dependencies [[`725ab4684`](https://github.com/firebase/firebase-js-sdk/commit/725ab4684ef0999a12f71e704c204a00fb030e5d)]:
  - @firebase/component@0.5.3
  - firebase@8.6.8

## 1.3.7

### Patch Changes

- Updated dependencies []:
  - firebase@8.6.7

## 1.3.6

### Patch Changes

- Updated dependencies [[`4c4b6aed9`](https://github.com/firebase/firebase-js-sdk/commit/4c4b6aed9757c9a7e75fb698a15e53274f93880b)]:
  - @firebase/component@0.5.2
  - firebase@8.6.6

## 1.3.5

### Patch Changes

- Updated dependencies []:
  - firebase@8.6.5

## 1.3.4

### Patch Changes

- Updated dependencies [[`5fbc5fb01`](https://github.com/firebase/firebase-js-sdk/commit/5fbc5fb0140d7da980fd7ebbfbae810f8c64ae19), [`b49345d31`](https://github.com/firebase/firebase-js-sdk/commit/b49345d31cdd3dfd42d65768156818dc09c7fa61)]:
  - @firebase/component@0.5.1
  - firebase@8.6.4

## 1.3.3

### Patch Changes

- Updated dependencies []:
  - firebase@8.6.3

## 1.3.2

### Patch Changes

- [`b97dd4e1d`](https://github.com/firebase/firebase-js-sdk/commit/b97dd4e1d366ade504703f73628bcd1920db434b) [#4901](https://github.com/firebase/firebase-js-sdk/pull/4901) - Allow using useEmulators() with only the storage configuration.

- Updated dependencies []:
  - firebase@8.6.2

## 1.3.1

### Patch Changes

- Updated dependencies []:
  - firebase@8.6.1

## 1.3.0

### Minor Changes

- [`66deb252d`](https://github.com/firebase/firebase-js-sdk/commit/66deb252d9aebf318d2410d2dee47f19ad0968da) [#4863](https://github.com/firebase/firebase-js-sdk/pull/4863) - Add support for Storage emulator to rules-unit-testing

### Patch Changes

- Updated dependencies [[`cc7207e25`](https://github.com/firebase/firebase-js-sdk/commit/cc7207e25f09870c6c718b8e209e694661676d27), [`81c131abe`](https://github.com/firebase/firebase-js-sdk/commit/81c131abea7001c5933156ff6b0f3925f16ff052)]:
  - firebase@8.6.0

## 1.2.12

### Patch Changes

- Updated dependencies [[`c34ac7a92`](https://github.com/firebase/firebase-js-sdk/commit/c34ac7a92a616915f38d192654db7770d81747ae), [`97f61e6f3`](https://github.com/firebase/firebase-js-sdk/commit/97f61e6f3d24e5b4c92ed248bb531233a94b9eaf), [`ac4ad08a2`](https://github.com/firebase/firebase-js-sdk/commit/ac4ad08a284397ec966e991dd388bb1fba857467)]:
  - @firebase/component@0.5.0
  - firebase@8.5.0
  - @firebase/util@1.1.0

## 1.2.11

### Patch Changes

- Updated dependencies []:
  - firebase@8.4.3

## 1.2.10

### Patch Changes

- Updated dependencies []:
  - firebase@8.4.2

## 1.2.9

### Patch Changes

- Updated dependencies []:
  - firebase@8.4.1

## 1.2.8

### Patch Changes

- Updated dependencies [[`7354a0ed4`](https://github.com/firebase/firebase-js-sdk/commit/7354a0ed438f4e3df6577e4927e8c8f8f1fbbfda), [`5ae73656d`](https://github.com/firebase/firebase-js-sdk/commit/5ae73656d976fa724ea6ca86d496e9531c95b29c)]:
  - firebase@8.4.0
  - @firebase/util@1.0.0
  - @firebase/component@0.4.1

## 1.2.7

### Patch Changes

- [`5ad7ff2ae`](https://github.com/firebase/firebase-js-sdk/commit/5ad7ff2ae955c297556223e6cb3ad9d4b897f664) [#4713](https://github.com/firebase/firebase-js-sdk/pull/4713) - Fix assertFails not correctly catching RTDB permission denied errors (#4667).

* [`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3) [#4714](https://github.com/firebase/firebase-js-sdk/pull/4714) - Internal typing changes

- [`5ef703143`](https://github.com/firebase/firebase-js-sdk/commit/5ef7031430bb3d451682e0a3cd9cbba5e9d6cef7) [#4717](https://github.com/firebase/firebase-js-sdk/pull/4717) (fixes [#4716](https://github.com/firebase/firebase-js-sdk/issues/4716)) - Depend on @firebase/component directly to fix the use with Yarn Plug'n'Play

- Updated dependencies [[`f24d8961b`](https://github.com/firebase/firebase-js-sdk/commit/f24d8961b3b87821413297688803fc85113086b3)]:
  - @firebase/component@0.4.0
  - firebase@8.3.3

## 1.2.6

### Patch Changes

- Updated dependencies [[`de5f90501`](https://github.com/firebase/firebase-js-sdk/commit/de5f9050137acc9ed1490082e5aa429b5de3cb2a)]:
  - @firebase/util@0.4.1
  - firebase@8.3.2

## 1.2.5

### Patch Changes

- Updated dependencies []:
  - firebase@8.3.1

## 1.2.4

### Patch Changes

- Updated dependencies [[`ec95df3d0`](https://github.com/firebase/firebase-js-sdk/commit/ec95df3d07e5f091f2a7f7327e46417f64d04b4e), [`b6080a857`](https://github.com/firebase/firebase-js-sdk/commit/b6080a857b1b56e10db041e6357acd69154e31fb)]:
  - @firebase/util@0.4.0
  - firebase@8.3.0

## 1.2.3

### Patch Changes

- Updated dependencies [[`d4ba8daa2`](https://github.com/firebase/firebase-js-sdk/commit/d4ba8daa298ec00f1800374e2bc5c6200575a233)]:
  - firebase@8.2.10

## 1.2.2

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.9

## 1.2.1

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.8

## 1.2.0

### Minor Changes

- [`97f26b716`](https://github.com/firebase/firebase-js-sdk/commit/97f26b7168a2765618c7469f5ed1bf86b7c4ee7e) [#4388](https://github.com/firebase/firebase-js-sdk/pull/4388) - Add port configuration and discovery methods to rules-unit-testing.

### Patch Changes

- Updated dependencies [[`05614aa86`](https://github.com/firebase/firebase-js-sdk/commit/05614aa86614994b69df154bd6ce34861fae37a5)]:
  - firebase@8.2.7

## 1.1.11

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.6

## 1.1.10

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.5

## 1.1.9

### Patch Changes

- Updated dependencies [[`92a7f4345`](https://github.com/firebase/firebase-js-sdk/commit/92a7f434536051bedd00bc1be7e774174378aa7d)]:
  - firebase@8.2.4

## 1.1.8

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.3

## 1.1.7

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.2

## 1.1.6

### Patch Changes

- Updated dependencies []:
  - firebase@8.2.1

## 1.1.5

### Patch Changes

- Updated dependencies [[`b662f8c0a`](https://github.com/firebase/firebase-js-sdk/commit/b662f8c0a9890cbdcf53cce7fe01c2a8a52d3d2d), [`6f2c7b7aa`](https://github.com/firebase/firebase-js-sdk/commit/6f2c7b7aae72d7be88c7a477f1a5d38bd5e8dfe4), [`c9f379cf7`](https://github.com/firebase/firebase-js-sdk/commit/c9f379cf7ef2c5938512a45b63008bbb135926ed)]:
  - firebase@8.2.0

## 1.1.4

### Patch Changes

- [`3a19f9e69`](https://github.com/firebase/firebase-js-sdk/commit/3a19f9e6987360dbded076937723acb3d1de82c9) [#4093](https://github.com/firebase/firebase-js-sdk/pull/4093) - Fix assertFails not recognising database permission denied error

- Updated dependencies [[`11563b227`](https://github.com/firebase/firebase-js-sdk/commit/11563b227f30c9282c45e4a8128d5679954dcfd1)]:
  - firebase@8.1.2

## 1.1.3

### Patch Changes

- Updated dependencies [[`4f6313262`](https://github.com/firebase/firebase-js-sdk/commit/4f63132622fa46ca7373ab93440c76bcb1822620)]:
  - firebase@8.1.1

## 1.1.2

### Patch Changes

- Updated dependencies [[`34973cde2`](https://github.com/firebase/firebase-js-sdk/commit/34973cde218e570baccd235d5bb6c6146559f80b)]:
  - firebase@8.1.0

## 1.1.1

### Patch Changes

- Updated dependencies []:
  - firebase@8.0.2

## 1.1.0

### Minor Changes

- [`6ef39d4d3`](https://github.com/firebase/firebase-js-sdk/commit/6ef39d4d346e7458f1559f15f82f734dec41611b) [#3928](https://github.com/firebase/firebase-js-sdk/pull/3928) - Add withFunctionTriggersDisabled function which runs a user-provided setup function with emulated Cloud Functions triggers disabled. This can be used to import data into the Realtime Database or Cloud Firestore emulators without triggering locally emulated Cloud Functions. This method only works with Firebase CLI version 8.13.0 or higher.

### Patch Changes

- Updated dependencies [[`9cf727fcc`](https://github.com/firebase/firebase-js-sdk/commit/9cf727fcc3d049551b16ae0698ac33dc2fe45ada)]:
  - @firebase/util@0.3.4
  - firebase@8.0.1

## 1.0.9

### Patch Changes

- Updated dependencies [[`ef33328f7`](https://github.com/firebase/firebase-js-sdk/commit/ef33328f7cb7d585a1304ed39649f5b69a111b3c), [`a5768b0aa`](https://github.com/firebase/firebase-js-sdk/commit/a5768b0aa7d7ce732279931aa436e988c9f36487), [`8939aeca0`](https://github.com/firebase/firebase-js-sdk/commit/8939aeca02921f9eacf1badb1068de22f670293e), [`79b049375`](https://github.com/firebase/firebase-js-sdk/commit/79b04937537b90422e051086112f6b43c2880cdb), [`344bd8856`](https://github.com/firebase/firebase-js-sdk/commit/344bd88566e2c42fd7ee92f28bb0f784629b48ee), [`0322c1bda`](https://github.com/firebase/firebase-js-sdk/commit/0322c1bda93b2885b995e3df2b63b48314546961), [`4b540f91d`](https://github.com/firebase/firebase-js-sdk/commit/4b540f91dbad217e8ec04b382b4c724308cb3df1), [`ffef32e38`](https://github.com/firebase/firebase-js-sdk/commit/ffef32e3837d3ee1098129b237e7a6e2e738182d), [`7d916d905`](https://github.com/firebase/firebase-js-sdk/commit/7d916d905ba16816ac8ac7c8748c83831ff614ce), [`602ec18e9`](https://github.com/firebase/firebase-js-sdk/commit/602ec18e92fd365a3a6432ff3a5f6a31013eb1f5), [`b247ffa76`](https://github.com/firebase/firebase-js-sdk/commit/b247ffa760aec1636de6cfc78851f97a840181ae)]:
  - firebase@8.0.0
  - @firebase/util@0.3.3

## 1.0.8

### Patch Changes

- [`cb28261e0`](https://github.com/firebase/firebase-js-sdk/commit/cb28261e0e3ef2f6a45badeb883888a6c0bdbed2) [#3923](https://github.com/firebase/firebase-js-sdk/pull/3923) (fixes [#3920](https://github.com/firebase/firebase-js-sdk/issues/3920)) - Do not delete uid property from user auth object in initializeTestApp()

* [`fe0ae19a9`](https://github.com/firebase/firebase-js-sdk/commit/fe0ae19a91fca422bf071ca4dfc4737daf848c59) [#3915](https://github.com/firebase/firebase-js-sdk/pull/3915) - Fix custom claims in rules-unit-testing

* Updated dependencies [[`eeb1dfa4f`](https://github.com/firebase/firebase-js-sdk/commit/eeb1dfa4f629dc5cf328e4b4a224369c0670c312), [`4f997bce1`](https://github.com/firebase/firebase-js-sdk/commit/4f997bce102be272b76836b6bcba96ea7de857bc)]:
  - firebase@7.24.0

## 1.0.7

### Patch Changes

- [`b9087b90f`](https://github.com/firebase/firebase-js-sdk/commit/b9087b90ff99b85acab6928459783c5683620737) [#3876](https://github.com/firebase/firebase-js-sdk/pull/3876) - Add stronger types to the 'options.auth' option for initializeTestApp

- Updated dependencies [[`48b0b0f7c`](https://github.com/firebase/firebase-js-sdk/commit/48b0b0f7c9137652f438cf04395debddeb3711d0), [`d4db75ff8`](https://github.com/firebase/firebase-js-sdk/commit/d4db75ff81388430489bd561ac2247fe9e0b6eb5), [`8728e1a0f`](https://github.com/firebase/firebase-js-sdk/commit/8728e1a0fc9027a21e3b77e4a058a7e8513a4646)]:
  - firebase@7.23.0

## 1.0.6

### Patch Changes

- Updated dependencies []:
  - firebase@7.22.1

## 1.0.5

### Patch Changes

- Updated dependencies [[`a6af7c279`](https://github.com/firebase/firebase-js-sdk/commit/a6af7c27925da47fa62ee3b7b0a267a272c52220)]:
  - firebase@7.22.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`7bf73797d`](https://github.com/firebase/firebase-js-sdk/commit/7bf73797dfe5271b8f380ce4bd2497d8589f05d9)]:
  - firebase@7.21.1

## 1.0.3

### Patch Changes

- [`3d9b5a595`](https://github.com/firebase/firebase-js-sdk/commit/3d9b5a595813b6c4f7f6ef4e3625ae8856a9fa23) [#3736](https://github.com/firebase/firebase-js-sdk/pull/3736) - Fix detection of admin context in Realtime Database SDK

- Updated dependencies [[`f9004177e`](https://github.com/firebase/firebase-js-sdk/commit/f9004177e76f00fc484d30c0c0e7b1bc2da033f9)]:
  - firebase@7.21.0

## 1.0.2

### Patch Changes

- Updated dependencies [[`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290), [`fb3b095e4`](https://github.com/firebase/firebase-js-sdk/commit/fb3b095e4b7c8f57fdb3172bc039c84576abf290)]:
  - @firebase/util@0.3.2
  - firebase@7.20.0

## 1.0.1

### Patch Changes

- [`e749ab8fc`](https://github.com/firebase/firebase-js-sdk/commit/e749ab8fcf8c371cd64fb7cfcaa8029bbacff849) [#3676](https://github.com/firebase/firebase-js-sdk/pull/3676) (fixes [#3671](https://github.com/firebase/firebase-js-sdk/issues/3671)) - Fix assertFails() logic of @firebase/rules-unit-testing

- Updated dependencies [[`61b4cd31b`](https://github.com/firebase/firebase-js-sdk/commit/61b4cd31b961c90354be38b18af5fbea9da8d5a3)]:
  - firebase@7.19.1

## 1.0.0

### Major Changes

- [`980c7d539`](https://github.com/firebase/firebase-js-sdk/commit/980c7d53964cd28d6c6ad2ab4b859580997a476c) [#3378](https://github.com/firebase/firebase-js-sdk/pull/3378) - Release `@firebase/rules-unit-testing` to replace the `@firebase/testing` package. The new
  package is API compatible but has the following breaking behavior changes:

  - `assertFails()` will now only fail on `PERMISSION DENIED` errors, not any error.
  - `initializeAdminApp()` now relies on `firebase-admin` rather than imitating the Admin SDK.

### Patch Changes

- Updated dependencies [[`67501b980`](https://github.com/firebase/firebase-js-sdk/commit/67501b9806c7014738080bc0be945b2c0748c17e)]:
  - firebase@7.19.0
