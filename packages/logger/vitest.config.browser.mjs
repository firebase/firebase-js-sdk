import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcovonly'],
      reportsDirectory: './coverage/browser'
    }
  }
});
