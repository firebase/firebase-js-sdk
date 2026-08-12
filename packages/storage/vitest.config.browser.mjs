import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

function storagePlatformPlugin(platform = 'browser') {
  return {
    name: 'storage-platform-plugin',
    enforce: 'pre',
    resolveId(source, importer) {
      const match = source.match(/^(.*\/platform)\/([^.\/]+)(\.ts)?$/);
      if (match) {
        const rewritten = `${match[1]}/${platform}/${match[2]}.ts`;
        return this.resolve(rewritten, importer, { skipSelf: true });
      }
      return null;
    }
  };
}

export default defineConfig({
  plugins: [storagePlatformPlugin('browser')],
  define: {
    'process.env': {},
    global: 'globalThis'
  },
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // Include unit tests (integration tests are in test/integration & test/browser)
    include: ['test/unit/**/*.test.ts'],
    exclude: ['test/node/**/*', 'test/integration/**/*', 'test/browser/**/*'],
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
    }
  }
});
