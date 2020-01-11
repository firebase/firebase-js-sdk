/**
 * A Promise implementation that supports deferred resolution.
 * 
 * TODO: merge this with the one in @firebase/util
 * 
 * @private
 */
export class Deferred<R> {
  promise: Promise<R>;
  resolve: (value?: R | Promise<R>) => void = () => {};
  reject: (reason?: Error) => void = () => {};

  constructor() {
    this.promise = new Promise(
      (
        resolve: (value?: R | Promise<R>) => void,
        reject: (reason?: Error) => void
      ) => {
        this.resolve = resolve;
        this.reject = reject;
      }
    );
  }
}