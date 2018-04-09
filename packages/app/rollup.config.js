import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import pkg from './package.json';

import firebasePkg from '../firebase/package.json';

const plugins = [
  typescript({
    typescript: require('typescript')
  }),
  replace({
    delimiters: ['${', '}'],
    values: {
      JSCORE_VERSION: firebasePkg.version
    }
  }),
  resolve(),
  commonjs()
];

const external = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);
export default {
  input: 'index.ts',
  output: [
    { file: pkg.main, format: 'cjs' },
    { file: pkg.module, format: 'es' }
  ],
  plugins,
  external
};
