import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

function storagePlatformPlugin(platform = 'browser') {
  return {
    name: `storage-platform-plugin-${platform}`,
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
  test: {
    globals: true,
    projects: [
      {
        plugins: [storagePlatformPlugin('browser')],
        define: {
          'process.env': {},
          global: 'globalThis'
        },
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
          include: ['test/unit/**/*.test.ts']
        }
      },
      {
        plugins: [storagePlatformPlugin('node')],
        test: {
          name: 'node',
          globals: true,
          environment: 'node',
          setupFiles: ['./test/setup.node.ts'],
          include: ['test/**/*.test.ts'],
          exclude: ['test/browser/**', '**/*.browser.test.ts'],
          fileParallelism: false
        }
      }
    ]
  }
});
