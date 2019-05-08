/** The global object in both Node and browser environments. */
export const root: any =
  (typeof self === 'object' && self.self === self && self) ||
  (typeof global === 'object' && global.global === global && global) ||
  this;
