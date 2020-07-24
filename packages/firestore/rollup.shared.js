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

const path = require('path');

const { renameInternals } = require('./scripts/rename-internals');
const { extractPublicIdentifiers } = require('./scripts/extract-api');
const { removeAsserts } = require('./scripts/remove-asserts');

const { externs } = require('./externs.json');
const pkg = require('./package.json');

/**
 * Returns an replacement configuration for `@rollup/plugin-alias` that replaces
 * references to platform-specific files with implementations for the provided
 * target platform.
 */
exports.generateAliasConfig = function (platform) {
  return {
    entries: [
      {
        find: /^(.*)\/platform\/([^.\/]*)(\.ts)?$/,
        replacement: `$1\/platform/${platform}/$2.ts`
      }
    ]
  };
};

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
exports.removeAssertTransformer = service => ({
  before: [removeAsserts(service.getProgram())],
  after: []
});

/**
 * Transformers that remove calls to `debugAssert`, messages for 'fail` and
 * `hardAssert` and appends a __PRIVATE_ prefix to all internal symbols.
 */
exports.removeAssertAndPrefixInternalTransformer = service => ({
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
exports.manglePrivatePropertiesOptions = {
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
