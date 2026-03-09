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
const { terser } = require('@rollup/plugin-terser');
const path = require('path');

const { renameInternals } = require('./scripts/rename-internals');
const { extractPublicIdentifiers } = require('./scripts/extract-api');
const { removeAsserts } = require('./scripts/remove-asserts');

const { externs } = require('./externs.json');
const pkg = require('./package.json');

// This file contains shared utilities for Firestore's rollup builds.

// Firestore is released in a number of different build configurations:
// - Browser builds that support persistence in ES2020 CJS and ESM formats.
// - In-memory Browser builds that support persistence in ES2020 CJS and ESM
//   formats.
// - A NodeJS build that supports persistence (to be used with an IndexedDb
//   shim)
// - A in-memory only NodeJS build
//
// The in-memory builds are roughly 130 KB smaller, but throw an exception
// for calls to `enablePersistence()` or `clearPersistence()`.
//
// We use two different rollup pipelines to take advantage of tree shaking,
// as Rollup does not support tree shaking for TypeScript classes transpiled
// down to ES5 (see https://bit.ly/340P23U). The build pipeline in this file
// produces tree-shaken ES2020 builds that are consumed by the ES5 builds in
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

const browserDeps = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/app'
];

const nodeDeps = [...browserDeps, 'util', 'path', 'url'];

/** Resolves the external dependencies for the browser build. */
exports.resolveBrowserExterns = function (id) {
  return [...browserDeps, '@firebase/firestore'].some(
    dep => id === dep || id.startsWith(`${dep}/`)
  );
};

/** Resolves the external dependencies for the Node build. */
exports.resolveNodeExterns = function (id) {
  return [...nodeDeps, '@firebase/firestore'].some(
    dep => id === dep || id.startsWith(`${dep}/`)
  );
};

/** Breaks the build if there is a circular dependency. */
exports.onwarn = function (warning, defaultWarn) {
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    throw new Error(warning);
  }
  defaultWarn(warning);
};

const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));

const publicIdentifiers = extractPublicIdentifiers(externsPaths);
// manually add `_delegate` because we don't have typings for the compat package
publicIdentifiers.add('_delegate');

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
exports.removeAssertAndPrefixInternalTransformer =
  removeAssertAndPrefixInternalTransformer;

/**
 * Terser options that mangle all properties prefixed with __PRIVATE_.
 */
const manglePrivatePropertiesOptions = {
  // Prevent parallelism in minification by terser
  // to prevent race conditions when writing the nameCache
  maxWorkers: 1,
  output: {
    comments: 'all',
    beautify: true
  },
  keep_fnames: true,
  keep_classnames: true,
  // use a shared name cache across all terser invocations as part of the
  // workaround for https://github.com/rollup/plugins/issues/1970.
  // The workaround works by populating this nameCache using a throwaway
  // build. Then subsequent builds using plugin-terser will use the generated
  // name cache to consistently rename properties across chunks.
  // TODO remove this when https://github.com/rollup/plugins/issues/1970 is fixed
  nameCache: {},
  mangle: {
    // Temporary hack fix for an issue where mangled code causes some downstream
    // bundlers (Babel?) to confuse the same variable name in different scopes.
    // This can be removed if the problem in the downstream library is fixed
    // or if terser's mangler provides an option to avoid mangling everything
    // that isn't a property.
    // `lastReasonableEscapeIndex` was causing problems in a switch statement
    // due to a Closure bug.
    // See issue: https://github.com/firebase/firebase-js-sdk/issues/5384
    reserved: ['_getProvider', '__PRIVATE_lastReasonableEscapeIndex'],
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

exports.applyPrebuilt = function (name = 'prebuilt.js') {
  return alias({
    entries: [
      {
        find: /^(.*)\/export$/,
        replacement: `$1\/dist/${name}`
      }
    ]
  });
};

// This is part of the workaround for https://github.com/rollup/plugins/issues/1970
// The workaround requires that a nameCache is supplied as an argument to
// the @rollup/plugin-terser. Only the 'params' property of the nameCache
// is required. If the 'vars' property of the nameCache is persisted through
// builds, this can cause name collisions if running both cjs and esm builds.
// This plugin, deletes 'vars' from a nameCache object, so that nameCache can
// be cleanly shared between esm and cjs builds.
// Make sure this plugin is run after terser in the plugins.
// Example `plugins: [terser({..., nameCache: myNameCache }), cleanUpNameCache(myNameCache)]`
// TODO Remove this when https://github.com/rollup/plugins/issues/1970 is fixed
function cleanupNameCache(nameCache = {}) {
  return {
    name: 'cleanup-name-cache-plugin',
    generateBundle() {
      delete nameCache.vars;
    }
  };
}
exports.cleanupNameCache = cleanupNameCache;
