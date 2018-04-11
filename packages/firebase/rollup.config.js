/**
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import uglify from 'rollup-plugin-uglify';
import pkg from './package.json';

const plugins = [resolve(), commonjs(), uglify()];

const GLOBAL_NAME = 'firebase';

/**
 * This is the firebase/app level config
 */
const appConfig = {
  input: 'app/index.js',
  output: {
    file: 'firebase-app.js',
    sourcemap: true,
    format: 'umd',
    name: GLOBAL_NAME
  },
  plugins
};

/**
 * This is the top level `firebase` config
 */
const firebaseJsConfig = {
  input: 'index.js',
  output: {
    file: 'firebase.js',
    sourcemap: true,
    format: 'umd',
    name: GLOBAL_NAME
  },
  plugins
};

/**
 * All of these configs are built to extend the top two configs
 */
const components = [
  'auth',
  'database',
  'firestore',
  'functions',
  'messaging',
  'storage'
];

const componentsConfig = components.map(component => ({
  input: `${component}/index.js`,
  output: {
    file: `firebase-${component}.js`,
    format: 'iife',
    sourcemap: true,
    extend: true,
    name: GLOBAL_NAME,
    globals: {
      '@firebase/app': GLOBAL_NAME
    },
    intro: `try  {`,
    outro: `} catch(err) {
              console.error(err);
              throw new Error(
                'Cannot instantiate firebase-${component} - ' +
                'be sure to load firebase-app.js first.'
              );
            }`
  },
  plugins,
  external: ['@firebase/app']
}));

export default [appConfig, ...componentsConfig, firebaseJsConfig];
