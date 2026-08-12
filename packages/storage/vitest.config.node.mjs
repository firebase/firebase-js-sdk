import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.node.ts'],
    include: ['test/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'test/browser/**',
      '**/*.browser.test.ts'
    ],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false
  },
  resolve: {
    alias: {
      '@firebase/app': path.resolve(__dirname, '../app/src/index.ts')
    }
  }
});
