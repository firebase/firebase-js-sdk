# @firebase/template

This package can be used as a template for anyone creating new packages in the
Firebase JS SDK. It will give you a couple things OOTB:

- **Typescript Support:** Your code should be written in TS to be consistent
  with the rest of the SDK.
- **Isomorphic Testing/Coverage:** Your tests will be run in both Node.js and
  Browser environments and coverage from both, collected.
- **Links to all of the other packages:** Should your new package need to take
  a dependency on any of the other packages in this monorepo (e.g.
  `@firebase/app`, `@firebase/util`, etc), all those dependencies are already
  set up, you can just remove the ones you don't need.
