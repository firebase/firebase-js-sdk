import { nodeResolve } from '@rollup/plugin-node-resolve';

// This is run from the auth-exp package.json
export default {
  input: ['test/integration/webdriver/static/index.js'],
  output: {
    file: 'test/integration/webdriver/static/dist/bundle.js',
    format: 'esm',
  },
  plugins: [nodeResolve()],
};
