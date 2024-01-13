This small app reproduces the issue with conditional exports and mocha and babel.

Setup:
1. `npm install`
2. `ln -s subproj node_modules/subproj`

To reproduce, run

```
npm run test
```

fixing the problem is easily done by collapsing the

```
"node": {
  "require": {
    "production": "./index.cjs",
    "development": "./index.dev.cjs"
```

to

```
"node": {
  "require": "./index.cjs",
```

in `subproj/package.json`; however, that is not a desirable workaround.
