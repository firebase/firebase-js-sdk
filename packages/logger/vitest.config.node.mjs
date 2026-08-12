import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.node.ts'],
    include: ['test/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
