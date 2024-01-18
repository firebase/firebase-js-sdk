import type { RollupOptions } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

function browserCommonJsRollupOptions(): RollupOptions {
  return {
    input: 'index.cjs',
    output: {
      file: 'dist/index.browser.cjs',
      format: 'cjs'
    },
    plugins: [commonjs(), nodeResolve({ browser: true })]
  };
}

function browserESModuleRollupOptions(): RollupOptions {
  return {
    input: 'index.mjs',
    output: {
      file: 'dist/index.browser.mjs',
      format: 'es'
    },
    plugins: [commonjs(), nodeResolve({ browser: true })]
  };
}

function browserEsm5RollupOptions(): RollupOptions {
  return {
    input: 'index.mjs',
    output: {
      file: 'dist/index.browser.esm5.mjs',
      format: 'es'
    },
    plugins: [
      commonjs(),
      nodeResolve({ browser: true, exportConditions: ['esm5'] })
    ]
  };
}

function nodeCommonJsRollupOptions(): RollupOptions {
  return {
    input: 'index.cjs',
    output: {
      file: 'dist/index.node.cjs',
      format: 'cjs'
    },
    plugins: [
      json(),
      commonjs(),
      nodeResolve({ browser: false, exportConditions: ['node'] })
    ]
  };
}

function nodeESModuleRollupOptions(): RollupOptions {
  return {
    input: 'index.mjs',
    output: {
      file: 'dist/index.node.mjs',
      format: 'es'
    },
    plugins: [
      json(),
      commonjs(),
      nodeResolve({ browser: false, exportConditions: ['node'] })
    ]
  };
}

function* allRollupOptions(): Generator<RollupOptions> {
  yield browserCommonJsRollupOptions();
  yield browserESModuleRollupOptions();
  yield browserEsm5RollupOptions();
  yield nodeCommonJsRollupOptions();
  yield nodeESModuleRollupOptions();
}

export default [...allRollupOptions()] satisfies RollupOptions[];
