# @firebase/auth-compat

## 0.2.7

### Patch Changes

- [`4983f4d5a`](https://github.com/firebase/firebase-js-sdk/commit/4983f4d5a0dc385c5b3e042ace44c8204d3cce81) [#5923](https://github.com/firebase/firebase-js-sdk/pull/5923) - Fix errors in compatibility layer when cookies are fully disabled in Chrome

* [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f) [#5928](https://github.com/firebase/firebase-js-sdk/pull/5928) - Upgrade `node-fetch` dependency due to a security issue.

* Updated dependencies [[`4983f4d5a`](https://github.com/firebase/firebase-js-sdk/commit/4983f4d5a0dc385c5b3e042ace44c8204d3cce81), [`d612d6f6e`](https://github.com/firebase/firebase-js-sdk/commit/d612d6f6e4d3113d45427b7df68459c0a3e31a1f), [`e04b7452b`](https://github.com/firebase/firebase-js-sdk/commit/e04b7452bae10e6525cfb9c551f76a1aa98f9078), [`2820674b8`](https://github.com/firebase/firebase-js-sdk/commit/2820674b848e918ab164e7d0ec9d5b838bbfa6e0)]:
  - @firebase/auth@0.19.7

## 0.2.6

### Patch Changes

- Updated dependencies [[`67b6decbb`](https://github.com/firebase/firebase-js-sdk/commit/67b6decbb9b5ee806d4109b9b6c188c4933e1270), [`922e9ed9a`](https://github.com/firebase/firebase-js-sdk/commit/922e9ed9a68c130aefa0cdb9b27720b73011c397)]:
  - @firebase/auth@0.19.6

## 0.2.5

### Patch Changes

- [`e3a5248fc`](https://github.com/firebase/firebase-js-sdk/commit/e3a5248fc8536fe2ca6d97483aa7e1b3f737dd17) [#5811](https://github.com/firebase/firebase-js-sdk/pull/5811) (fixes [#5791](https://github.com/firebase/firebase-js-sdk/issues/5791)) - Fix persistence selection in compatibility layer in worker scripts

- Updated dependencies [[`3b481f572`](https://github.com/firebase/firebase-js-sdk/commit/3b481f572456e1eab3435bfc25717770d95a8c49), [`e3a5248fc`](https://github.com/firebase/firebase-js-sdk/commit/e3a5248fc8536fe2ca6d97483aa7e1b3f737dd17)]:
  - @firebase/util@1.4.3
  - @firebase/auth@0.19.5
  - @firebase/component@0.5.10

## 0.2.4

### Patch Changes

- Updated dependencies [[`a777385d6`](https://github.com/firebase/firebase-js-sdk/commit/a777385d67653cdcc3b839149dde867f32b48369), [`dc6b447ba`](https://github.com/firebase/firebase-js-sdk/commit/dc6b447bac4e899a0c4741ec18bf19e2ae66731a)]:
  - @firebase/auth@0.19.4

## 0.2.3

### Patch Changes

- Updated dependencies [[`1583a8202`](https://github.com/firebase/firebase-js-sdk/commit/1583a82022bfd404e94f28d1786e596d6b5a9f43)]:
  - @firebase/auth@0.19.3

## 0.2.2

### Patch Changes

- [`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a) [#5708](https://github.com/firebase/firebase-js-sdk/pull/5708) (fixes [#1487](https://github.com/firebase/firebase-js-sdk/issues/1487)) - Update build scripts to work with the exports field

- Updated dependencies [[`3281315fa`](https://github.com/firebase/firebase-js-sdk/commit/3281315fae9c6f535f9d5052ee17d60861ea569a), [`dbd54f7c9`](https://github.com/firebase/firebase-js-sdk/commit/dbd54f7c9ef0b5d78d491e26d816084a478bdf04)]:
  - @firebase/auth@0.19.2
  - @firebase/component@0.5.9
  - @firebase/util@1.4.2

## 0.2.1

### Patch Changes

- [`31bd6f27f`](https://github.com/firebase/firebase-js-sdk/commit/31bd6f27f965a561f814bad1110a43849a6a9cbf) [#5689](https://github.com/firebase/firebase-js-sdk/pull/5689) - Add SAMLAuthProvider to the compatability layer (it was missing before)

* [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684) [#5693](https://github.com/firebase/firebase-js-sdk/pull/5693) - Add exports field to all packages

* Updated dependencies [[`31bd6f27f`](https://github.com/firebase/firebase-js-sdk/commit/31bd6f27f965a561f814bad1110a43849a6a9cbf), [`2322b6023`](https://github.com/firebase/firebase-js-sdk/commit/2322b6023c628cd9f4f4172767c17d215dd91684), [`0765b5e19`](https://github.com/firebase/firebase-js-sdk/commit/0765b5e19c3e949bb33233ee52c8e33f01418e54)]:
  - @firebase/auth@0.19.1
  - @firebase/component@0.5.8
  - @firebase/util@1.4.1

## 0.2.0

### Minor Changes

- [`b6f30c24f`](https://github.com/firebase/firebase-js-sdk/commit/b6f30c24fdf096ac4e8bdba32b9c1380903a7507) [#5617](https://github.com/firebase/firebase-js-sdk/pull/5617) (fixes [#5610](https://github.com/firebase/firebase-js-sdk/issues/5610)) - Fix behavior on subsequent calls to `getRedirectResult()`

### Patch Changes

- Updated dependencies [[`b6f30c24f`](https://github.com/firebase/firebase-js-sdk/commit/b6f30c24fdf096ac4e8bdba32b9c1380903a7507), [`69ff8eb54`](https://github.com/firebase/firebase-js-sdk/commit/69ff8eb549e49de51cae11a04bce023bb6e1fc02), [`2429ac105`](https://github.com/firebase/firebase-js-sdk/commit/2429ac105b0aeb15eb8c362665448c209887bada), [`4594d3fd6`](https://github.com/firebase/firebase-js-sdk/commit/4594d3fd6c7f7680b877aa2017ba35084ef6af96), [`6dacc2400`](https://github.com/firebase/firebase-js-sdk/commit/6dacc2400fdcf4432ed1977ca1eb148da6db3fc5)]:
  - @firebase/auth@0.19.0

## 0.1.6

### Patch Changes

- Updated dependencies [[`93795c780`](https://github.com/firebase/firebase-js-sdk/commit/93795c7801d6b28ccbbe5855fd2f3fc377b1db5f)]:
  - @firebase/auth@0.18.3

## 0.1.5

### Patch Changes

- [`f7d8324a1`](https://github.com/firebase/firebase-js-sdk/commit/f7d8324a188f013f7875cf6c35fc4beb2c78c0ae) [#5562](https://github.com/firebase/firebase-js-sdk/pull/5562) - Bugfix

- Updated dependencies [[`1b0e7af13`](https://github.com/firebase/firebase-js-sdk/commit/1b0e7af130c59b867e84b3f2615248fedad5b83d), [`e1d551ddb`](https://github.com/firebase/firebase-js-sdk/commit/e1d551ddb29db0f1fdf25c986cfcae6804bc8e79), [`f7d8324a1`](https://github.com/firebase/firebase-js-sdk/commit/f7d8324a188f013f7875cf6c35fc4beb2c78c0ae), [`e456d00a7`](https://github.com/firebase/firebase-js-sdk/commit/e456d00a7d054b2e95476562a087f2b12301e800)]:
  - @firebase/auth@0.18.2

## 0.1.4

### Patch Changes

- Updated dependencies [[`49b0406ab`](https://github.com/firebase/firebase-js-sdk/commit/49b0406abb9b211c5b75325b0383539ac03358d1)]:
  - @firebase/auth@0.18.1

## 0.1.3

### Patch Changes

- Updated dependencies [[`a5d87bc5c`](https://github.com/firebase/firebase-js-sdk/commit/a5d87bc5c5d6360d5fa2386fe351937463bc45b8), [`a99943fe3`](https://github.com/firebase/firebase-js-sdk/commit/a99943fe3bd5279761aa29d138ec91272b06df39), [`07b88e6e8`](https://github.com/firebase/firebase-js-sdk/commit/07b88e6e80f60525c66bf330d28160dbef2d0a2c), [`b835b4cba`](https://github.com/firebase/firebase-js-sdk/commit/b835b4cbabc4b7b180ae38b908c49205ce31a422), [`4d2a54fb0`](https://github.com/firebase/firebase-js-sdk/commit/4d2a54fb0611ab1987ad415c265440b9bbbc28c6), [`c2362214a`](https://github.com/firebase/firebase-js-sdk/commit/c2362214ad6154ce013d3815a6f1ccd061679f66)]:
  - @firebase/auth@0.18.0
  - @firebase/util@1.4.0
  - @firebase/component@0.5.7

## 0.1.2

### Patch Changes

- Updated dependencies [[`08ec55d6d`](https://github.com/firebase/firebase-js-sdk/commit/08ec55d6dfcc85207fbdcdde77d6508f27998603), [`271303f3c`](https://github.com/firebase/firebase-js-sdk/commit/271303f3ca6fa47c646177a41d7a3e3f31e1d296)]:
  - @firebase/auth@0.17.2

## 0.1.1

### Patch Changes

- Updated dependencies [[`66596f3f8`](https://github.com/firebase/firebase-js-sdk/commit/66596f3f8c747158bf30b62d8f579f7eecf97081)]:
  - @firebase/auth@0.17.1

## 0.1.0

### Minor Changes

- [`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6) [#5345](https://github.com/firebase/firebase-js-sdk/pull/5345) (fixes [#5015](https://github.com/firebase/firebase-js-sdk/issues/5015)) - Release modularized SDKs

### Patch Changes

- Updated dependencies [[`cdada6c68`](https://github.com/firebase/firebase-js-sdk/commit/cdada6c68f9740d13dd6674bcb658e28e68253b6)]:
  - @firebase/auth@0.17.0
  - @firebase/auth-types@0.11.0
