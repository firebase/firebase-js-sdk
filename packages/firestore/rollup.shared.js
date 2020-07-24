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

import * as path from 'path';

import { externs } from './externs.json';
import { renameInternals } from './scripts/rename-internals';
import { extractPublicIdentifiers } from './scripts/extract-api';
import { removeAsserts } from './scripts/remove-asserts';

import pkg from './package.json';

/**
 * Returns an replacement configuration for `@rollup/plugin-alias` that replaces
 * references to platform-specific files with implementations for the provided
 * target platform.
 */
export function generateAliasConfig(platform) {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/${platform}/$2.ts`
      }
    ]
  };
}

const browserDeps = Object.keys(
  Object.assign({}, pkg.peerDependencies, pkg.dependencies)
);

const nodeDeps = [...browserDeps, 'util', 'path'];

/** Resolves the external dependencies for the browser build. */
export function resolveBrowserExterns(id) {
  return browserDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
}

/** Resolves the external dependencies for the Node build. */
export function resolveNodeExterns(id) {
  return nodeDeps.some(dep => id === dep || id.startsWith(`${dep}/`));
}

const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));
const publicIdentifiers = extractPublicIdentifiers(externsPaths);

/**
 * Transformers that remove calls to `debugAssert` and messages for 'fail` and
 * `hardAssert`.
 */
export const removeAssertTransformer = service => ({
  before: [removeAsserts(service.getProgram())],
  after: []
});

/**
 * Transformers that remove calls to `debugAssert`, messages for 'fail` and
 * `hardAssert` and appends a __PRIVATE_ prefix to all internal symbols.
 */
export const removeAssertAndPrefixInternalTransformer = service => ({
  before: [
    removeAsserts(service.getProgram()),
    renameInternals(service.getProgram(), {
      publicIdentifiers,
      prefix: '__PRIVATE_'
    })
  ],
  after: []
});

/**
 * Terser options that mangle all properties prefixed with __PRIVATE_.
 */
export const manglePrivatePropertiesOptions = {
  output: {
    comments: 'all',
    beautify: true
  },
  mangle: {
    properties: {
      regex: /^__PRIVATE_/
    }
  }
};
