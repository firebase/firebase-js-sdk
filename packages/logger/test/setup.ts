import { beforeAll, afterAll } from 'vitest';

(globalThis as any).before = beforeAll;
(globalThis as any).after = afterAll;

if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = { env: {} };
}
