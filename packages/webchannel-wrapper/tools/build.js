const closureBuilder = require('closure-builder');
const glob = closureBuilder.globSupport();
const { resolve } = require('path');

closureBuilder.build({
  name: 'firebase.webchannel.wrapper',
  srcs: glob([
    resolve(__dirname, '../src/**/*.js'),
  ]),
  out: 'dist/index.js',
  options: {
    closure: {
      output_wrapper: "module.exports = (function() {%output%; return namespacesToExport}).call(typeof window !== 'undefined' ? window : this)",
      language_out: 'ECMASCRIPT5'
    }
  }
});