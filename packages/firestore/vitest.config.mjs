import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function firestorePlatformPlugin(platform = 'browser') {
  return {
    name: `firestore-platform-plugin-${platform}`,
    enforce: 'pre',
    resolveId(source, importer) {
      if (platform === 'node') {
        if (source.endsWith('/platform/base64') || source.endsWith('/platform/base64.ts')) {
          return path.resolve(__dirname, 'src/platform/base64.ts');
        }
        if (source.includes('./node/base64') || source.endsWith('/node/base64')) {
          return path.resolve(__dirname, 'src/platform/node/base64.ts');
        }
      }
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
    passWithNoTests: true,
    projects: [
      {
        plugins: [firestorePlatformPlugin('browser')],
        define: {
          'process.env': {},
          'process.env.NODE_ENV': JSON.stringify('test'),
          'process.env.TEST_PLATFORM': JSON.stringify('browser'),
          global: 'globalThis'
        },
        test: {
          name: 'browser',
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
      },
      {
        plugins: [firestorePlatformPlugin('node')],
        define: {
          'process.env.NODE_ENV': JSON.stringify('test'),
          'process.env.TEST_PLATFORM': JSON.stringify('node')
        },
        test: {
          name: 'node',
          globals: true,
          passWithNoTests: true,
          setupFiles: ['./test/setup.node.ts'],
          include: ['test/unit/**/*.test.ts'],
          exclude: [
            'test/unit/**/*.browser.test.ts',
            'test/unit/local/indexeddb_*.test.ts',
            'test/unit/local/simple_db.test.ts',
            'test/unit/local/remote_document_change_buffer.test.ts',
            'test/browser/**/*',
            'test/integration/**/*',
            'test/lite/**/*'
          ]
        }
      }
    ]
  }
});
