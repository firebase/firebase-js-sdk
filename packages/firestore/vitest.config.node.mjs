import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function firestorePlatformPlugin(platform = 'node') {
  return {
    name: 'firestore-platform-plugin',
    enforce: 'pre',
    resolveId(source, importer) {
      if (source.endsWith('/platform/base64') || source.endsWith('/platform/base64.ts')) {
        return path.resolve(__dirname, 'src/platform/base64.ts');
      }
      if (source.includes('./node/base64') || source.endsWith('/node/base64')) {
        return path.resolve(__dirname, 'src/platform/node/base64.ts');
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
  plugins: [firestorePlatformPlugin('node')],
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
    'process.env.TEST_PLATFORM': JSON.stringify('node')
  },
  test: {
    environment: 'node',
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
    ],
    testTimeout: 20000,
    hookTimeout: 20000
  }
});
