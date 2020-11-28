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

const tmp = require('tmp');
const json = require('@rollup/plugin-json');
const alias = require('@rollup/plugin-alias');
const typescriptPlugin = require('rollup-plugin-typescript2');
const typescript = require('typescript');
const { terser } = require('rollup-plugin-terser');
const path = require('path');
const sourcemaps = require('rollup-plugin-sourcemaps');

const { renameInternals } = require('./scripts/rename-internals');
const { extractPublicIdentifiers } = require('./scripts/extract-api');
const { removeAsserts } = require('./scripts/remove-asserts');

const { externs } = require('./externs.json');
const pkg = require('./package.json');

// This file contains shared utilities for Firestore's rollup builds.

// Firestore is released in a number of different build configurations:
// - Browser builds that support persistence in ES5 CJS and ES5 ESM formats and
//   ES2017 in ESM format.
// - In-memory Browser builds that support persistence in ES5 CJS and ES5 ESM
//   formats and ES2017 in ESM format.
// - A NodeJS build that supports persistence (to be used with an IndexedDb
//   shim)
// - A in-memory only NodeJS build
//
// The in-memory builds are roughly 130 KB smaller, but throw an exception
// for calls to `enablePersistence()` or `clearPersistence()`.
//
// We use two different rollup pipelines to take advantage of tree shaking,
// as Rollup does not support tree shaking for Typescript classes transpiled
// down to ES5 (see https://bit.ly/340P23U). The build pipeline in this file
// produces tree-shaken ES2017 builds that are consumed by the ES5 builds in
// `rollup.config.es.js`.
//
// All browser builds rely on Terser's property name mangling to reduce code
// size.
//
// See https://g3doc/firebase/jscore/g3doc/contributing/builds.md
// for a description of the various JavaScript formats used in our SDKs.

/**
 * Returns an replacement configuration for `@rollup/plugin-alias` that replaces
 * references to platform-specific files with implementations for the provided
 * target platform.
 */
function generateAliasConfig(platform) {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/${platform}/$2.ts`
      }
    ]
  };
}
exports.generateAliasConfig = generateAliasConfig;

const browserDeps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const nodeDeps = [...browserDeps, 'util', 'path'];

/** Resolves the external dependencies for the browser build. */
exports.resolveBrowserExterns = function (id) {
  return browserDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
};

/** Resolves the external dependencies for the Node build. */
exports.resolveNodeExterns = function (id) {
  return nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
};

const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));
const publicIdentifiers = extractPublicIdentifiers(externsPaths);

/**
 * Transformers that remove calls to `debugAssert` and messages for 'fail` and
 * `hardAssert`.
 */
const removeAssertTransformer = service => ({
  before: [removeAsserts(service.getProgram())],
  after: []
});
exports.removeAssertTransformer = removeAssertTransformer;

/**
 * Transformers that remove calls to `debugAssert`, messages for 'fail` and
 * `hardAssert` and appends a __PRIVATE_ prefix to all internal symbols.
 */
const removeAssertAndPrefixInternalTransformer = service => ({
  before: [
    removeAsserts(service.getProgram()),
    renameInternals(service.getProgram(), {
      publicIdentifiers,
      prefix: '__PRIVATE_'
    })
  ],
  after: []
});
exports.removeAssertAndPrefixInternalTransformer = removeAssertAndPrefixInternalTransformer;

/**
 * Terser options that mangle all properties prefixed with __PRIVATE_.
 */
const manglePrivatePropertiesOptions = {
  output: {
    comments: 'all',
    beautify: true
  },
  mangle: {
    properties: {
      regex: /^__PRIVATE_/,
      // All JS Keywords are reserved. Although this should be taken cared of by
      // Terser, we have seen issues with `do`, hence the extra caution.
      reserved: [
        'abstract',
        'arguments',
        'await',
        'boolean',
        'break',
        'byte',
        'case',
        'catch',
        'char',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'double',
        'else',
        'enum',
        'eval',
        'export',
        'extends',
        'false',
        'final',
        'finally',
        'float',
        'for',
        'function',
        'goto',
        'if',
        'implements',
        'import',
        'in',
        'instanceof',
        'int',
        'interface',
        'let',
        'long',
        'native',
        'new',
        'null',
        'package',
        'private',
        'protected',
        'public',
        'return',
        'short',
        'static',
        'super',
        'switch',
        'synchronized',
        'this',
        'throw',
        'throws',
        'transient',
        'true',
        'try',
        'typeof',
        'var',
        'void',
        'volatile',
        'while',
        'with',
        'yield'
      ]
    }
  }
};
exports.manglePrivatePropertiesOptions = manglePrivatePropertiesOptions;

exports.es2017Plugins = function (platform, mangled = false) {
  if (mangled) {
    return [
      alias(generateAliasConfig(platform)),
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017'
          }
        },
        cacheDir: tmp.dirSync(),
        transformers: [removeAssertAndPrefixInternalTransformer]
      }),
      json({ preferConst: true }),
      terser(manglePrivatePropertiesOptions)
    ];
  } else {
    return [
      alias(generateAliasConfig(platform)),
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            target: 'es2017'
          }
        },
        cacheDir: tmp.dirSync(),
        transformers: [removeAssertTransformer]
      }),
      json({ preferConst: true })
    ];
  }
};

exports.es2017ToEs5Plugins = function (mangled = false) {
  if (mangled) {
    return [
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            allowJs: true
          }
        },
        include: ['dist/**/*.js']
      }),
      terser({
        output: {
          comments: 'all',
          beautify: true
        },
        mangle: true
      }),
      sourcemaps()
    ];
  } else {
    return [
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            allowJs: true
          }
        },
        include: ['dist/**/*.js']
      }),
      sourcemaps()
    ];
  }
};
