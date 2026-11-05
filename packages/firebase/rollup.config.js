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

import appPkg from './app/package.json' with { type: 'json' };
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import pkg from './package.json' with { type: 'json' };
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import resolveModule from '@rollup/plugin-node-resolve';
import rollupTypescriptPlugin from 'rollup-plugin-typescript2';
import sourcemaps from 'rollup-plugin-sourcemaps';
import terser from '@rollup/plugin-terser';
import typescript from 'typescript';
import { emitModulePackageFile } from '../../scripts/build/rollup_emit_module_package_file.js';

const external = Object.keys(pkg.dependencies || {});
const plugins = [sourcemaps(), resolveModule(), json(), commonjs()];

const typescriptPlugin = rollupTypescriptPlugin({
  typescript
});

const typescriptPluginCDN = rollupTypescriptPlugin({
  typescript,
  allowJs: true,
  include: ['*.ts', '**/*.ts', '*.js', '**/*.js'],
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
    input: 'app/index.ts',
    output: [
      { file: resolve('app', appPkg.browser), format: 'es', sourcemap: true }
    ],
    plugins: [...plugins, typescriptPlugin, emitModulePackageFile()],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  },
  /**
   * App CJS/MJS builds
   */
  {
    input: 'app/index.ts',
    output: [
      {
        file: resolve('app', appPkg.main),
        format: 'cjs',
        esModule: true,
        sourcemap: true
      },
      {
        file: resolve('app', appPkg.main.replace('.cjs.js', '.mjs')),
        format: 'es',
        sourcemap: true
      }
    ],
    plugins: [...plugins, typescriptPlugin],
    external: id => external.some(dep => id === dep || id.startsWith(`${dep}/`))
  }
];

const componentBuilds = [...pkg.components, ...(pkg.nonCdnComponents || [])]
  // The "app" component is treated differently because it doesn't depend on itself.
  .filter(component => component !== 'app')
  .map(component => {
    const pkg = JSON.parse(
      readFileSync(`./${component}/package.json`, 'utf-8')
    );
    return [
      /**
       * Component ESM Build
       * Uses "type:module" in package.json to signal this is ESM.
       * Allows the extension to remain '.js' as some tools do not recognize
       * '.mjs'.
       */
      {
        input: `${component}/index.ts`,
        output: [
          {
            file: resolve(component, pkg.browser),
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
        input: `${component}/index.ts`,
        output: [
          {
            file: resolve(component, pkg.main),
            format: 'cjs',
            esModule: true,
            sourcemap: true
          },
          {
            file: resolve(component, pkg.main.replace('.cjs.js', '.mjs')),
            format: 'es',
            sourcemap: true
          }
        ],
        plugins: [...plugins, typescriptPlugin],
        external: id =>
          external.some(dep => id === dep || id.startsWith(`${dep}/`))
      }
    ];
  })
  .reduce((a, b) => a.concat(b), []);

/**
 * Fails the build if a CDN bundle imports any module other than
 * `@firebase/app`, which `gulp cdn-type-module-path` rewrites to the URL of
 * firebase-app.js on gstatic. Browsers can't resolve any other bare module
 * specifier (for example a Node.js built-in module such as `fs`), so a CDN
 * bundle that imports one fails to load.
 */
function cdnImportsGuard() {
  return {
    name: 'cdn-imports-guard',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') {
          continue;
        }
        const disallowedImports = [
          ...chunk.imports,
          ...chunk.dynamicImports
        ].filter(id => id !== '@firebase/app' && !(id in bundle));
        if (disallowedImports.length > 0) {
          this.error(
            `${chunk.fileName} imports ${disallowedImports.join(', ')}. ` +
              'CDN bundles may only import @firebase/app, because browsers ' +
              "can't resolve other bare module specifiers."
          );
        }
      }
    }
  };
}

/**
 * Plugins for the CDN builds. Browsers load these bundles directly, so
 * dependencies must resolve to their browser builds (the `browser` field and
 * the `browser` export condition). Otherwise packages that ship separate
 * Node.js and browser implementations, such as the OpenTelemetry packages that
 * `@firebase/crashlytics` depends on, contribute their Node.js implementations,
 * and the bundle imports Node.js built-in modules.
 */
const cdnPlugins = [
  sourcemaps(),
  resolveModule({ browser: true }),
  json(),
  commonjs(),
  cdnImportsGuard()
];

/**
 * CDN script builds
 */
const cdnBuilds = [
  {
    input: 'app/index.cdn.ts',
    output: {
      file: 'firebase-app.js',
      sourcemap: true,
      format: 'es'
    },
    plugins: [...cdnPlugins, typescriptPluginCDN]
  },
  ...pkg.components
    .filter(component => component !== 'app')
    .map(component => {
      // It is needed for handling sub modules, for example firestore/lite which should produce firebase-firestore-lite.js
      // Otherwise, we will create a directory with '/' in the name.
      const componentName = component.replaceAll('/', '-');

      return {
        input: existsSync(`${component}/index.cdn.ts`)
          ? `${component}/index.cdn.ts`
          : `${component}/index.ts`,
        output: {
          file: `firebase-${componentName}.js`,
          sourcemap: true,
          format: 'es'
        },
        plugins: [
          ...cdnPlugins,
          typescriptPluginCDN,
          terser({
            format: { comments: false },
            keep_fnames: true,
            keep_classnames: true,
            mangle: {
              reserved: ['_getProvider', '__PRIVATE_lastReasonableEscapeIndex']
            }
          })
        ],
        external: ['@firebase/app']
      };
    })
];

export default [...appBuilds, ...componentBuilds, ...cdnBuilds];
