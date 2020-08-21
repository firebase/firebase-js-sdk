import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescriptPlugin from '@rollup/plugin-typescript';
import babel from '@rollup/plugin-babel';

export default {
  input: 'index.ts',
  output: {
    file: 'bundle.js',
    format: 'iife',
    sourcemap: true
  },
  plugins: [
    resolve(),
    typescriptPlugin(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      presets: [['@babel/preset-env', {
        "targets": {
          "ie": "11"
        }
      }
      ]]
    })
  ]
};

