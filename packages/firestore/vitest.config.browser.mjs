import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

function firestorePlatformPlugin(platform = 'browser') {
  return {
    name: 'firestore-platform-plugin',
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
  plugins: [firestorePlatformPlugin('browser')],
  define: {
    'process.env': {},
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.TEST_PLATFORM': JSON.stringify('browser'),
    global: 'globalThis'
  },
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/unit/**/*.test.ts'],
    exclude: [
      'test/unit/**/*.node.test.ts',
      'test/unit/**/node/**/*.test.ts',
      'test/node/**/*',
      'test/integration/**/*',
      'test/lite/**/*'
    ],
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
