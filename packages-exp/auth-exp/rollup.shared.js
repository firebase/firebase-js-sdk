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

const pkg = require('./package.json');

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