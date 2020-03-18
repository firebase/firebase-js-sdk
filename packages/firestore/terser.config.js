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

const externsPaths = externs.map(p => path.resolve(__dirname, '../../', p));
const publicIdentifiers = extractPublicIdentifiers(externsPaths);

/**
 * A transformer that appends a __PRIVATE_ prefix to all internal symbols.
 */
export const appendPrivatePrefixTransformers = [
  service => ({
    before: [
      renameInternals(service.getProgram(), {
        publicIdentifiers,
        prefix: '__PRIVATE_'
      })
    ],
    after: []
  })
];

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
