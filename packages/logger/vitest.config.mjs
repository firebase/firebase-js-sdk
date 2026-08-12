import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'browser',
          globals: true,
          browser: {
            enabled: true,
            provider: playwright({
              launchOptions: {
                channel: 'chrome',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
              }
            }),
            headless: true,
            instances: [{ browser: 'chromium' }]
          },
          setupFiles: ['./test/setup.ts'],
          include: ['test/**/*.test.ts']
        }
      },
      {
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          setupFiles: ['./test/setup.node.ts'],
          include: ['test/**/*.test.ts']
        }
      }
    ]
  }
});
