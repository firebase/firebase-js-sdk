const repl = require('repl');
const firebase = require('../packages/firebase');

const replInst = repl.start('> ');

Object.defineProperty(replInst.context, 'firebase', {
  configurable: false,
  enumerable: true,
  value: firebase
});
