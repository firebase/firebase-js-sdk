export interface PromiseOutcomes<T> {
  resolve: (outcome: T) => void;
  reject: (error: Error) => void;
}

export interface PendingPromise<T> extends Promise<T>, PromiseOutcomes<T> {
}

export function _makePendingPromise<T>(): PendingPromise<T> {
  const promise = new Promise((resolve, reject) => {
    promise.resolve = resolve;
    promise.reject = reject;
  }) as PendingPromise<T>;

  return promise;
}