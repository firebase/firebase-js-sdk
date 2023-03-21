/**
 * @license
 * Copyright 2020 Google LLC
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

import { resolve } from 'path';
import resolveModule from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';
import { uglify } from 'rollup-plugin-uglify';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import pkg from '../package.json';
import compatPkg from './package.json';
import appPkg from './app/package.json';
import { emitModulePackageFile } from '../../../scripts/build/rollup_emit_module_package_file';

const external = Object.keys(pkg.dependencies || {});
const uglifyOptions = {
  mangle: {
    // Hack for a bug in Closure regarding switch block scope
    reserved: ['__PRIVATE_lastReasonableEscapeIndex']
  },
  webkit: true // Necessary to avoid https://bugs.webkit.org/show_bug.cgi?id=223533
};

/**
 * Global UMD Build
 */
const GLOBAL_NAME = 'firebase';

function createUmdOutputConfig(output) {
  return {
    file: output,
    format: 'umd',
    sourcemap: true,
    extend: true,
    name: GLOBAL_NAME,
    globals: {
      '@firebase/app-compat': GLOBAL_NAME,
      '@firebase/app': `${GLOBAL_NAME}.INTERNAL.modularAPIs`
    },

    /**
     * use iife to avoid below error in the old Safari browser
     * SyntaxError: Functions cannot be declared in a nested block in strict mode
     * https://github.com/firebase/firebase-js-sdk/issues/1228
     *
     */
    intro: `
           try {
             (function() {`,
    outro: `
           }).apply(this, arguments);
         } catch(err) {
             console.error(err);
             throw new Error(
               'Cannot instantiate ${output} - ' +
               'be sure to load firebase-app.js first.'
             );
           }`
  };
}

const plugins = [sourcemaps(), resolveModule(), json(), commonjs()];

const typescriptPlugin = rollupTypescriptPlugin({
  typescript
});

const typescriptPluginCDN = rollupTypescriptPlugin({
  typescript,
  tsconfigOverride: {
    compilerOptions: {
      declaration: false
    }
  }
});

/**
 * Individual Component Builds
 */
const appBuilds = [
  /**
   * App ESM Build
   * Uses "type:module" in package.json to signal this is ESM.
   * Allows the extension to remain '.js' as some tools do not recognize
   * '.mjs'.
   */
  {
    input: `${__dirname}/app/index.ts`,
    output: [
      {
        file: resolve(__dirname, 'app', appPkg.browser),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [...plugins, typescriptPlugin, emitModulePackageFile()],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * App CJS/MJS Builds
   */
  {
    input: `${__dirname}/app/index.ts`,
    output: [
      {
        file: resolve(__dirname, 'app', appPkg.main),
        format: 'cjs',
        sourcemap: true
      },
      {
        file: resolve(__dirname, 'app', appPkg.main.replace('.cjs.js', '.mjs')),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [...plugins, typescriptPlugin],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * App UMD Builds
   */
  {
    input: `${__dirname}/app/index.cdn.ts`,
    output: {
      file: 'firebase-app-compat.js',
      sourcemap: true,
      format: 'umd',
      name: GLOBAL_NAME
    },
    plugins: [...plugins, typescriptPluginCDN, uglify(uglifyOptions)]
  }
];

const componentBuilds = compatPkg.components
  // The "app" component is treated differently because it doesn't depend on itself.
  .filter(component => component !== 'app')
  .map(component => {
    const pkg = require(`${__dirname}/${component}/package.json`);
    return [
      /**
       * Component ESM build
       * Uses "type:module" in package.json to signal this is ESM.
       * Allows the extension to remain '.js' as some tools do not recognize
       * '.mjs'.
       */
      {
        input: `${__dirname}/${component}/index.ts`,
        output: [
          {
            file: resolve(__dirname, component, pkg.browser),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins: [...plugins, typescriptPlugin, emitModulePackageFile()],
        external: id =>
          external.some(dep => id === dep || id.startsWith(`${dep}/`))
      },
      /**
       * Component CJS/MJS builds
       */
      {
        input: `${__dirname}/${component}/index.ts`,
        output: [
          {
            file: resolve(__dirname, component, pkg.main),
            format: 'cjs',
            sourcemap: true
          },
          {
            file: resolve(
              __dirname,
              component,
              pkg.main.replace('.cjs.js', '.mjs')
            ),
            format: 'es',
            sourcemap: true
          },
          {
            file: resolve(__dirname, component, pkg.browser),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins: [...plugins, typescriptPlugin],
        external: id =>
          external.some(dep => id === dep || id.startsWith(`${dep}/`))
      },
      /**
       * Component UMD build
       */
      {
        input: `${__dirname}/${component}/index.ts`,
        output: createUmdOutputConfig(`firebase-${component}-compat.js`),
        plugins: [...plugins, typescriptPluginCDN, uglify(uglifyOptions)],
        external: ['@firebase/app-compat', '@firebase/app']
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

/**
 * Complete Package Builds
 */
const completeBuilds = [
  /**
   * App Browser Builds
   */
  {
    input: `${__dirname}/index.ts`,
    output: [
      {
        file: resolve(__dirname, compatPkg.browser),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [...plugins, typescriptPlugin],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  {
    input: `${__dirname}/index.cdn.ts`,
    output: {
      file: 'firebase-compat.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [...plugins, typescriptPluginCDN, uglify(uglifyOptions)]
  },
  /**
   * App Node.js Builds
   */
  {
    input: `${__dirname}/index.node.ts`,
    output: {
      file: resolve(__dirname, compatPkg.main),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [...plugins, typescriptPlugin],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * App React Native Builds
   */
  {
    input: `${__dirname}/index.rn.ts`,
    output: {
      file: resolve(__dirname, compatPkg['react-native']),
      format: 'cjs',
      sourcemap: true
    },
    plugins: [...plugins, typescriptPlugin],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * Performance script Build
   */
  {
    input: `${__dirname}/index.perf.ts`,
    output: {
      file: 'firebase-performance-standalone-compat.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [
      sourcemaps(),
      resolveModule({
        exportConditions: ['liteesm5', 'esm5']
      }),
      typescriptPluginCDN,
      json(),
      commonjs(),
      uglify(uglifyOptions)
    ]
  },
  /**
   * Performance script Build in ES2017
   */
  {
    input: `${__dirname}/index.perf.ts`,
    output: {
      file: 'firebase-performance-standalone-compat.es2017.js',
      format: 'umd',
      sourcemap: true,
      name: GLOBAL_NAME
    },
    plugins: [
      sourcemaps(),
      resolveModule({
        exportConditions: ['lite']
      }),
      rollupTypescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017',
            declaration: false
          }
        }
      }),
      json({
        preferConst: true
      }),
      commonjs(),
      terser()
    ]
  }
];

export default [...appBuilds, ...componentBuilds, ...completeBuilds];
