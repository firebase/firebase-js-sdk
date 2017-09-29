const __global = (() => {
	if (typeof global !== 'undefined') { return global; }
	if (typeof window !== 'undefined') { return window; }
  if (typeof self !== 'undefined') { return self; }
	throw new Error('unable to locate global object');
})();

// Polyfill Promise
if (typeof Promise === 'undefined') {
  // HACK: TS throws an error if I attempt to use 'dot-notation'
  __global['Promise'] = Promise = require('promise-polyfill') as PromiseConstructor;
}
