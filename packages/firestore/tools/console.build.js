const rollup = require('rollup');
const typescript = require('rollup-plugin-typescript2');
const resolve = require('rollup-plugin-node-resolve');
const uglify = require('rollup-plugin-uglify');
const fs = require('fs');
const util = require('util')
const fs_writeFile = util.promisify(fs.writeFile)

const plugins = [
    resolve(),
    typescript({
        typescript: require('typescript')
    }),
    uglify()
];

const EXPORTNAME = '__firebase_exports_temp_';

// see below for details on the options
const inputOptions = {
    input: 'index.console.ts',
    plugins
};
const outputOptions = {
    file: 'dist/standalone.js',
    name: EXPORTNAME,
    format: 'iife'
};

const PREFIX = `
goog.module('firestore');
exports =
    (function() {
      var sdk_exports = eval(
          'var __firestore_exports__ = { firestore: {}};'+
`;

const POSTFIX = `
    +'__firestore_exports__.firestore = ${EXPORTNAME};'
    +'__firestore_exports__');
    return sdk_exports.firestore;
  }).call(window);
`;

async function build() {
    // create a bundle
    const bundle = await rollup.rollup(inputOptions);

    // generate code
    const { code } = await bundle.generate(outputOptions);

    const output = `${PREFIX}${JSON.stringify(String(code))}${POSTFIX}`;

    await fs_writeFile(outputOptions.file, output); 
}

build();