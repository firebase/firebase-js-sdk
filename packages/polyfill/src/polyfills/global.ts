const __global = (() => {
  if (typeof global !== 'undefined') {
    return global;
  }
  if (typeof window !== 'undefined') {
    return window;
  }
  if (typeof self !== 'undefined') {
    return self;
  }
  throw new Error('unable to locate global object');
})();

export const global = __global;
