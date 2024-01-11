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

import path from 'path';

import type { RollupAliasOptions } from '@rollup/plugin-alias';
import type { RollupWarning, WarningHandler, Plugin } from 'rollup';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import type { Options as TerserOptions } from 'rollup-plugin-terser';
import typescriptPlugin from 'rollup-plugin-typescript2';
import typescript from 'typescript';

import { externs } from './externs.json';
import pkg from './package.json';
import { extractPublicIdentifiers } from './scripts/extract-api';
import { removeAsserts } from './scripts/remove-asserts';
import { renameInternals } from './scripts/rename-internals';

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
export function generateAliasConfig(platform: string): RollupAliasOptions {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/${platform}/$2.ts`
      }
    ]
  };
}

const browserDeps: string[] = [
  ...Object.keys(Object.assign({}, pkg.peerDependencies, pkg.dependencies)),
  '@firebase/app'
];

const nodeDeps: string[] = [...browserDeps, 'util', 'path', 'url'];

/** Resolves the external dependencies for the browser build. */
export function resolveBrowserExterns(id: string): boolean {
  return [...browserDeps, '@firebase/firestore'].some(
    dep => id === dep || id.startsWith(`${dep}/`)
  );
}

/** Resolves the external dependencies for the Node build. */
export function resolveNodeExterns(id: string): boolean {
  return [...nodeDeps, '@firebase/firestore'].some(
    dep => id === dep || id.startsWith(`${dep}/`)
  );
}

/** Breaks the build if there is a circular dependency. */
export function onwarn(
  warning: RollupWarning,
  defaultWarn: WarningHandler
): void {
  if (warning.code === 'CIRCULAR_DEPENDENCY') {
    throw new Error(`circular dependency: ${JSON.stringify(warning)}`);
  }
  defaultWarn(warning);
}

const externsPaths: string[] = externs.map(p =>
  path.resolve(__dirname, '../../', p)
);

const publicIdentifiers: Set<string> = extractPublicIdentifiers(externsPaths);
// manually add `_delegate` because we don't have typings for the compat package
publicIdentifiers.add('_delegate');

/**
 * Transformers that remove calls to `debugAssert` and messages for 'fail` and
 * `hardAssert`.
 */
export function removeAssertTransformer(
  service: typescript.LanguageService
): typescript.CustomTransformers {
  return {
    before: [removeAsserts(service.getProgram()!)],
    after: []
  };
}

/**
 * Transformers that remove calls to `debugAssert`, messages for 'fail` and
 * `hardAssert` and appends a __PRIVATE_ prefix to all internal symbols.
 */
export function removeAssertAndPrefixInternalTransformer(
  service: typescript.LanguageService
): typescript.CustomTransformers {
  return {
    before: [
      removeAsserts(service.getProgram()!),
      renameInternals(service.getProgram()!, {
        publicIdentifiers,
        prefix: '__PRIVATE_'
      })
    ],
    after: []
  };
}

/**
 * Terser options that mangle all properties prefixed with __PRIVATE_.
 */
export const manglePrivatePropertiesOptions: TerserOptions = {
  output: {
    comments: 'all',
    beautify: true
  },
  keep_fnames: true,
  keep_classnames: true,
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

export function es2017ToEs5Plugins(mangled: boolean = false): Plugin[] {
  if (mangled) {
    return [
      typescriptPlugin({
        typescript,
        tsconfigOverride: {
          compilerOptions: {
            allowJs: true
          }
        },
        include: ['dist/**/*.js'],
        verbosity: 2
      }),
      terser({
        output: {
          comments: 'all',
          beautify: true
        },
        // See comment above `manglePrivatePropertiesOptions`. This build did
        // not have the identical variable name issue but we should be
        // consistent.
        mangle: {
          reserved: ['_getProvider']
        }
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
        include: ['dist/**/*.js'],
        verbosity: 2
      }),
      sourcemaps()
    ];
  }
}
