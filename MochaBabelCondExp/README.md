This small app reproduces the issue with conditional exports and mocha and babel.

Setup:
1. `npm install`
2. `ln -sf ../subproj node_modules/subproj`

To reproduce, run

```
npm run test:js
```

or

```
npm run test:ts
```

or even just

```
node mocha_init.js
```

Fixing the problem is easily done by collapsing the

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

Another workaround is to switch from commonjs to esm modules by adding
`"type":"module"` to `package.json` and changing the `require()` to `import` in
`mocha_init.js`.
