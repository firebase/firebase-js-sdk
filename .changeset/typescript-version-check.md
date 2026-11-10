---
'firebase': patch
---

TypeScript versions older than 4.5, which can't parse the Firebase type declarations, now report that Firebase requires TypeScript 4.5 or later. TypeScript leaves out this error if other type declarations, such as a recent `@types/node`, also fail to parse.
