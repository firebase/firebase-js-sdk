import resolve from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'index.mjs',
    output: {
      file: 'dist/index.browser.cjs',
      format: 'cjs'
    },
    plugins: [resolve({ browser: true })]
  },
  {
    input: 'index.mjs',
    output: {
      file: 'dist/index.browser.mjs',
      format: 'es'
    },
    plugins: [resolve({ browser: true })]
  }
];
