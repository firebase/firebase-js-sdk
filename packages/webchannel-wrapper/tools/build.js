/**
 * Copyright 2017 Google Inc.
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

const closureBuilder = require('closure-builder');
const glob = closureBuilder.globSupport();
const { resolve } = require('path');

closureBuilder.build({
  name: 'firebase.webchannel.wrapper',
  srcs: glob([resolve(__dirname, '../src/**/*.js')]),
  externs: [resolve(__dirname, '../externs/overrides.js')],
  out: 'dist/index.js',
  options: {
    closure: {
      output_wrapper:
        "(function() {%output%}).call(typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : {})",
      language_out: 'ECMASCRIPT5',
      compilation_level: 'ADVANCED_OPTIMIZATIONS'
    }
  }
});
