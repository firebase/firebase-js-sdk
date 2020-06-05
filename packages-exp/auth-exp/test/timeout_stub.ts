import * as sinon from 'sinon';

interface TimerTripFn {
  (): void;
}

export interface TimerMap {
  [key: number]: TimerTripFn;
}

/**
 * Stubs window.setTimeout and returns a map of the functions that were passed
 * in (the map is mutable and will be modified as setTimeout gets called).
 * You can use this to manually cause timers to trip. The map is keyed by the
 * duration of the timeout
 */
export function stubTimeouts(ids?: number[]): TimerMap {
  const callbacks: {[key: number]: TimerTripFn} = {};
  let idCounter = 0;

  sinon.stub(window, 'setTimeout').callsFake((cb: () => void, duration) => {
    callbacks[duration] = cb;
    // For some bizarre reason setTimeout always get shoehorned into NodeJS.Timeout,
    // which is flat-wrong. This is the easiest way to fix it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const id = ids ? ids[idCounter] : idCounter + 100;
    idCounter++;
    return id as any;
  });

  return callbacks;
}

/**
 * Similar to stubTimeouts, but for use when there's only one timeout you
 * care about
 */
export function stubSingleTimeout(id?: number): TimerTripFn {
  const callbacks = stubTimeouts(id ? [id]: undefined);
  return () => {
    const [key, ...rest] = Object.keys(callbacks).map(Number);
    if (rest.length) {
      throw new Error('stubSingleTimeout should only be used when a single timeout is set');
    }

    callbacks[key]();
  };
}