import { beforeAll, afterAll } from 'vitest';

// 1. Mocha BDD hook compatibility
(globalThis as any).before = beforeAll;
(globalThis as any).after = afterAll;

// 2. Browser environment polyfill (for Sinon stubs & timers)
if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: {} };
}
if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis;
}

// 3. Mocha .timeout() chaining compatibility
const origIt = (globalThis as any).it;
if (origIt) {
  const wrappedIt = (...args: any[]) => {
    const result = origIt(...args);
    return {
      timeout: () => result
    };
  };
  Object.assign(wrappedIt, origIt);
  (globalThis as any).it = wrappedIt;
}
