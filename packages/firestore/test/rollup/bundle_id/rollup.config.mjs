import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  {
    input: 'index.cjs',
    output: {
      file: 'dist/index.browser.cjs',
      format: 'cjs'
    },
    plugins: [commonjs(), nodeResolve({ browser: true })]
  },
  {
    input: 'index.mjs',
    output: {
      file: 'dist/index.browser.mjs',
      format: 'es'
    },
    plugins: [commonjs(), nodeResolve({ browser: true })]
  }
];
