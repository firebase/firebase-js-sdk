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

/**
 * Replace "-exp" with "" in all files within the directory.
 * Used to generate reference docs without "-exp" in package names.
 */
const { argv } = require('yargs');
const path = require('path');
const { readdirSync, statSync, readFileSync, writeFileSync } = require('fs');

// can be used in command line
if (argv._[0]) {
  const dirOrFile = path.resolve(argv._[0]);
  if (statSync(dirOrFile).isFile()) {
    removeExpSuffixFromFile(dirOrFile);
  } else {
    removeExpSuffix(dir);
  }
}

function removeExpSuffix(dir) {
  for (const file of readdirSync(dir)) {
    const filePath = `${dir}/${file}`;
    if (statSync(filePath).isFile()) {
      removeExpSuffixFromFile(filePath);
    }
  }
}

function removeExpSuffixFromFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // replace -exp with empty string
  const modified = content.replace(/-exp/g, '');

  writeFileSync(filePath, modified, 'utf-8');
}

exports.removeExpSuffix = removeExpSuffix;
